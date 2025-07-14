import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getInverseRelationship } from '@/lib/relationships';
import { encrypt, decrypt } from '@/services/encryption';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get family members
    const families = await prisma.family.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Decrypt family data before returning
    const decryptedFamilies = families.map(family => {
      let decryptedFullName = family.fullName;
      let decryptedIC = family.ic;
      let decryptedPhone = family.phone;

      try {
        decryptedFullName = decrypt(family.fullName);
      } catch (error) {
        console.error('Error decrypting family fullName:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedIC = decrypt(family.ic);
      } catch (error) {
        console.error('Error decrypting family IC:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedPhone = decrypt(family.phone);
      } catch (error) {
        console.error('Error decrypting family phone:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      return {
        ...family,
        fullName: decryptedFullName,
        ic: decryptedIC,
        phone: decryptedPhone,
      };
    });

    // Get pending invitations
    const pendingInvitations = await prisma.familyInvitation.findMany({
      where: {
        inviterId: userId,
        status: 'pending'
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Decrypt invitation data before returning
    const decryptedInvitations = pendingInvitations.map(invitation => {
      let decryptedFullName = invitation.inviteeFullName;
      let decryptedIC = invitation.inviteeIC;
      let decryptedPhone = invitation.inviteePhone;

      try {
        decryptedFullName = decrypt(invitation.inviteeFullName);
      } catch (error) {
        console.error('Error decrypting invitation fullName:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedIC = decrypt(invitation.inviteeIC);
      } catch (error) {
        console.error('Error decrypting invitation IC:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedPhone = decrypt(invitation.inviteePhone);
      } catch (error) {
        console.error('Error decrypting invitation phone:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      return {
        ...invitation,
        inviteeFullName: decryptedFullName,
        inviteeIC: decryptedIC,
        inviteePhone: decryptedPhone,
      };
    });

    return NextResponse.json({
      families: decryptedFamilies,
      pendingInvitations: decryptedInvitations
    });
  } catch (error) {
    console.error('Error fetching families:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.fullName || !body.ic || !body.relationship || !body.phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if a family member with this IC already exists for the current user
    // Need to decrypt stored ICs to check for duplicates
    const existingFamilies = await prisma.family.findMany({
      where: { userId: userId },
      select: { id: true, ic: true }
    });

    const icExists = existingFamilies.some(family => {
      try {
        const decryptedIC = decrypt(family.ic);
        return decryptedIC === body.ic;
      } catch (error) {
        console.error('Error decrypting family IC for duplicate check:', error);
        // Try direct comparison for backward compatibility
        return family.ic === body.ic;
      }
    });

    if (icExists) {
      return NextResponse.json(
        { error: 'Family member with this IC already exists for your account' },
        { status: 400 }
      );
    }

    // Check if the IC belongs to a registered user by decrypting stored ICs
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, ic: true, phone: true }
    });

    let registeredUser = null;
    for (const user of users) {
      try {
        const decryptedIC = decrypt(user.ic);
        if (decryptedIC === body.ic) {
          registeredUser = {
            id: user.id,
            fullName: user.fullName,
            ic: user.ic,
            phone: user.phone,
          };
          break;
        }
      } catch (error) {
        console.error('Error decrypting user IC:', error);
        // Try direct comparison for backward compatibility
        if (user.ic === body.ic) {
          registeredUser = user;
          break;
        }
      }
    }

    // Encrypt family data before storing
    const encryptedFullName = encrypt(body.fullName);
    const encryptedIC = encrypt(body.ic);
    const encryptedPhone = encrypt(body.phone);

    // Create the family member entry
    const family = await prisma.family.create({
      data: {
        fullName: encryptedFullName,
        ic: encryptedIC,
        relationship: body.relationship,
        phone: encryptedPhone,
        isRegistered: !!registeredUser,
        userId: userId,
        // If the person is registered, set up the bidirectional relationship
        ...(registeredUser && {
          relatedUserId: registeredUser.id,
          inverseRelationship: getInverseRelationship(body.relationship),
        }),
      },
    });

    // If the person is registered, create the reciprocal relationship
    if (registeredUser) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, ic: true, phone: true },
      });

      if (currentUser) {
        // Check if the current user is already a family member of the registered user
        // Need to decrypt stored ICs to check for existing reciprocal relationship
        const existingReciprocalFamilies = await prisma.family.findMany({
          where: { userId: registeredUser.id },
          select: { id: true, ic: true }
        });

        const reciprocalExists = existingReciprocalFamilies.some(family => {
          try {
            const decryptedIC = decrypt(family.ic);
            const currentUserIC = decrypt(currentUser.ic);
            return decryptedIC === currentUserIC;
          } catch (error) {
            console.error('Error decrypting ICs for reciprocal check:', error);
            // Try direct comparison for backward compatibility
            return family.ic === currentUser.ic;
          }
        });

        // Only create the reciprocal relationship if it doesn't exist
        if (!reciprocalExists) {
          await prisma.family.create({
            data: {
              fullName: currentUser.fullName, // Already encrypted
              ic: currentUser.ic, // Already encrypted
              relationship: getInverseRelationship(body.relationship),
              phone: currentUser.phone, // Already encrypted
              isRegistered: true,
              userId: registeredUser.id,
              relatedUserId: userId,
              inverseRelationship: body.relationship,
            },
          });
        }
      }
    }

    // Return decrypted data to frontend
    return NextResponse.json({
      ...family,
      fullName: body.fullName,
      ic: body.ic,
      phone: body.phone,
    });
  } catch (error) {
    console.error('Error creating family member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { id, fullName, ic, relationship, phone } = body;

    // Validate required fields
    if (!id || !fullName || !ic || !relationship || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if family member exists and belongs to current user
    const existingFamily = await prisma.family.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingFamily) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      );
    }

    // Check if another family member with this IC already exists for the current user (excluding current record)
    const otherFamilies = await prisma.family.findMany({
      where: { 
        userId: userId,
        id: { not: id }
      },
      select: { id: true, ic: true }
    });

    const icExistsInOthers = otherFamilies.some(family => {
      try {
        const decryptedIC = decrypt(family.ic);
        return decryptedIC === ic;
      } catch (error) {
        console.error('Error decrypting family IC for duplicate check:', error);
        // Try direct comparison for backward compatibility
        return family.ic === ic;
      }
    });

    if (icExistsInOthers) {
      return NextResponse.json(
        { error: 'Another family member with this IC already exists for your account' },
        { status: 400 }
      );
    }

    // Check if the IC belongs to a registered user by decrypting stored ICs
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, ic: true, phone: true }
    });

    let registeredUser = null;
    for (const user of users) {
      try {
        const decryptedIC = decrypt(user.ic);
        if (decryptedIC === ic) {
          registeredUser = {
            id: user.id,
            fullName: user.fullName,
            ic: user.ic,
            phone: user.phone,
          };
          break;
        }
      } catch (error) {
        console.error('Error decrypting user IC:', error);
        // Try direct comparison for backward compatibility
        if (user.ic === ic) {
          registeredUser = user;
          break;
        }
      }
    }

    // Encrypt family data before storing
    const encryptedFullName = encrypt(fullName);
    const encryptedIC = encrypt(ic);
    const encryptedPhone = encrypt(phone);

    // Update the family member
    const updatedFamily = await prisma.family.update({
      where: { id: id },
      data: {
        fullName: encryptedFullName,
        ic: encryptedIC,
        relationship: relationship,
        phone: encryptedPhone,
        isRegistered: !!registeredUser,
        ...(registeredUser && {
          relatedUserId: registeredUser.id,
          inverseRelationship: getInverseRelationship(relationship),
        }),
      },
    });

    // Return decrypted data to frontend
    return NextResponse.json({
      ...updatedFamily,
      fullName: fullName,
      ic: ic,
      phone: phone,
    });
  } catch (error) {
    console.error('Error updating family member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 