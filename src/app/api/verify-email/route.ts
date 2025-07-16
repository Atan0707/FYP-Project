import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getInverseRelationship } from '@/lib/relationships';
import { encrypt, decrypt } from '@/services/encryption';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, verificationCode } = body;

    if (!email || !verificationCode) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    // Find the temporary user by decrypting emails and matching verification code
    const tempUsers = await prisma.temporaryUser.findMany({
      where: {
        verificationCode,
        expiresAt: {
          gt: new Date() // Check if not expired
        }
      }
    });

    let tempUser = null;
    for (const user of tempUsers) {
      try {
        const decryptedEmail = decrypt(user.email);
        if (decryptedEmail === email) {
          tempUser = {
            id: user.id,
            email: user.email,
            password: user.password,
            fullName: user.fullName,
            ic: user.ic,
            phone: user.phone,
            decryptedEmail,
            decryptedFullName: decrypt(user.fullName),
            decryptedIC: decrypt(user.ic),
            decryptedPhone: decrypt(user.phone),
          };
          break;
        }
      } catch (error) {
        console.error('Error decrypting temp user data:', error);
        continue;
      }
    }

    if (!tempUser) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Check if user already exists by decrypting stored data
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        ic: true,
      }
    });

    const userExists = existingUsers.some(user => {
      try {
        const decryptedEmail = decrypt(user.email);
        const decryptedIC = decrypt(user.ic);
        return decryptedEmail === tempUser.decryptedEmail || decryptedIC === tempUser.decryptedIC;
      } catch (error) {
        console.error('Error decrypting existing user data:', error);
        return false;
      }
    });

    if (userExists) {
      // Clean up the temporary user
      await prisma.temporaryUser.delete({
        where: { id: tempUser.id }
      });
      return NextResponse.json({ error: 'User already exists with this email or IC' }, { status: 400 });
    }

    // Create the actual user with encrypted data
    const newUser = await prisma.user.create({
      data: {
        email: tempUser.email, // Already encrypted
        password: tempUser.password,
        fullName: tempUser.fullName, // Already encrypted
        ic: tempUser.ic, // Already encrypted
        phone: tempUser.phone, // Already encrypted
      },
    });

    // Update any existing family members with this IC (same logic as before)
    try {
      const familyEntries = await prisma.family.findMany({
        where: {
          isRegistered: false,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              ic: true,
              phone: true,
            }
          }
        }
      });

      // Filter family entries by decrypting IC numbers
      const matchingFamilyEntries = [];
      for (const family of familyEntries) {
        try {
          // For family entries, IC might not be encrypted yet, so we need to check both cases
          try {
            const decryptedFamilyIC = decrypt(family.ic);
            if (decryptedFamilyIC === tempUser.decryptedIC) {
              matchingFamilyEntries.push(family);
            }
          } catch {
            // If decryption fails, try direct comparison (for non-encrypted data)
            if (family.ic === tempUser.decryptedIC) {
              matchingFamilyEntries.push(family);
            }
          }
        } catch (error) {
          console.error('Error processing family IC:', error);
        }
      }

      if (matchingFamilyEntries.length > 0) {
        for (const family of matchingFamilyEntries) {
          await prisma.family.update({
            where: { id: family.id },
            data: {
              isRegistered: true,
              relatedUserId: newUser.id,
              inverseRelationship: getInverseRelationship(family.relationship),
            }
          });

          // Check for existing reciprocal relationship by decrypting user IC
          const existingReciprocals = await prisma.family.findMany({
            where: {
              userId: newUser.id
            }
          });

          let existingReciprocal = null;
          for (const reciprocal of existingReciprocals) {
            try {
              const decryptedReciprocalIC = decrypt(reciprocal.ic);
              const decryptedUserIC = decrypt(family.user.ic);
              if (decryptedReciprocalIC === decryptedUserIC) {
                existingReciprocal = reciprocal;
                break;
              }
                         } catch {
               // Try direct comparison for non-encrypted data
               if (reciprocal.ic === family.user.ic) {
                 existingReciprocal = reciprocal;
                 break;
               }
             }
          }

          if (!existingReciprocal) {
            // Create new reciprocal relationship with encrypted data
            await prisma.family.create({
              data: {
                fullName: encrypt(family.user.fullName),
                ic: encrypt(family.user.ic),
                phone: encrypt(family.user.phone),
                relationship: getInverseRelationship(family.relationship),
                isRegistered: true,
                userId: newUser.id,
                relatedUserId: family.user.id,
                inverseRelationship: family.relationship,
              }
            });
          } else {
            await prisma.family.update({
              where: { id: existingReciprocal.id },
              data: {
                relationship: getInverseRelationship(family.relationship),
                inverseRelationship: family.relationship,
                relatedUserId: family.user.id,
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating family relationships:', error);
    }

    // Clean up the temporary user
    await prisma.temporaryUser.delete({
      where: { id: tempUser.id }
    });

    return NextResponse.json({ success: true, message: 'Email verified and account created successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json({ error: 'Something went wrong during verification' }, { status: 500 });
  }
} 