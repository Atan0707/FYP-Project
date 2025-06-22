import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getInverseRelationship } from '@/lib/relationships';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, verificationCode } = body;

    if (!email || !verificationCode) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    // Find the temporary user
    const tempUser = await prisma.temporaryUser.findFirst({
      where: {
        email,
        verificationCode,
        expiresAt: {
          gt: new Date() // Check if not expired
        }
      }
    });

    if (!tempUser) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Check if user already exists (in case they try to verify multiple times)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: tempUser.email },
          { ic: tempUser.ic }
        ]
      }
    });

    if (existingUser) {
      // Clean up the temporary user
      await prisma.temporaryUser.delete({
        where: { id: tempUser.id }
      });
      return NextResponse.json({ error: 'User already exists with this email or IC' }, { status: 400 });
    }

    // Create the actual user
    const newUser = await prisma.user.create({
      data: {
        email: tempUser.email,
        password: tempUser.password,
        fullName: tempUser.fullName,
        ic: tempUser.ic,
        phone: tempUser.phone,
      },
    });

    // Update any existing family members with this IC (same logic as before)
    try {
      const familyEntries = await prisma.family.findMany({
        where: {
          ic: tempUser.ic,
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

      if (familyEntries.length > 0) {
        for (const family of familyEntries) {
          await prisma.family.update({
            where: { id: family.id },
            data: {
              isRegistered: true,
              relatedUserId: newUser.id,
              inverseRelationship: getInverseRelationship(family.relationship),
            }
          });

          const existingReciprocal = await prisma.family.findFirst({
            where: {
              ic: family.user.ic,
              userId: newUser.id
            }
          });

          if (!existingReciprocal) {
            await prisma.family.create({
              data: {
                fullName: family.user.fullName,
                ic: family.user.ic,
                phone: family.user.phone,
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