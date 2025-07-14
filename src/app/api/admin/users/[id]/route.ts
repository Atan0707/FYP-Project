import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = (await params).id;

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        ic: true,
        phone: true,
        address: true,
        photo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Decrypt user data
    let decryptedEmail = user.email;
    let decryptedFullName = user.fullName;
    let decryptedIC = user.ic;
    let decryptedPhone = user.phone;

    try {
      decryptedEmail = decrypt(user.email);
    } catch (error) {
      console.error('Error decrypting user email:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    try {
      decryptedFullName = decrypt(user.fullName);
    } catch (error) {
      console.error('Error decrypting user fullName:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    try {
      decryptedIC = decrypt(user.ic);
    } catch (error) {
      console.error('Error decrypting user IC:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    try {
      decryptedPhone = decrypt(user.phone);
    } catch (error) {
      console.error('Error decrypting user phone:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    // Get user's family members
    const familyMembersRaw = await prisma.family.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        ic: true,
        relationship: true,
        phone: true,
        isRegistered: true,
        relatedUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Decrypt family member data
    const familyMembers = familyMembersRaw.map(member => {
      let decryptedFamilyFullName = member.fullName;
      let decryptedFamilyIC = member.ic;
      let decryptedFamilyPhone = member.phone;

      try {
        decryptedFamilyFullName = decrypt(member.fullName);
      } catch (error) {
        console.error('Error decrypting family member fullName:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedFamilyIC = decrypt(member.ic);
      } catch (error) {
        console.error('Error decrypting family member IC:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedFamilyPhone = decrypt(member.phone);
      } catch (error) {
        console.error('Error decrypting family member phone:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      return {
        ...member,
        fullName: decryptedFamilyFullName,
        ic: decryptedFamilyIC,
        phone: decryptedFamilyPhone,
      };
    });

    // Get user's assets
    const assets = await prisma.asset.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        value: true,
        description: true,
        pdfFile: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      user: {
        ...user,
        email: decryptedEmail,
        fullName: decryptedFullName,
        ic: decryptedIC,
        phone: decryptedPhone,
      },
      familyMembers,
      assets,
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 