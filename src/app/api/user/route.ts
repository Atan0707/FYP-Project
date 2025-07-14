import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/services/encryption'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the full user data including address and photo
    try {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          ic: true,
          phone: true,
          address: true,
          photo: true,
        },
      })

      if (!fullUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Decrypt user data before returning
      let decryptedEmail = fullUser.email;
      let decryptedFullName = fullUser.fullName;
      let decryptedIC = fullUser.ic;
      let decryptedPhone = fullUser.phone;

      try {
        decryptedEmail = decrypt(fullUser.email);
      } catch (error) {
        console.error('Error decrypting email:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedFullName = decrypt(fullUser.fullName);
      } catch (error) {
        console.error('Error decrypting fullName:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedIC = decrypt(fullUser.ic);
      } catch (error) {
        console.error('Error decrypting IC:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedPhone = decrypt(fullUser.phone);
      } catch (error) {
        console.error('Error decrypting phone:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      // Format the response to match your User type
      return NextResponse.json({
        id: fullUser.id,
        name: decryptedFullName,
        email: decryptedEmail,
        ic: decryptedIC,
        phone: decryptedPhone,
        address: fullUser.address || '',
        photo: fullUser.photo || '/images/default-avatar.jpg'
      })
    } catch (dbError) {
      console.error('Database error fetching user:', dbError)
      return NextResponse.json(
        { error: 'Database error' }, 
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in auth process:', error)
    return NextResponse.json(
      { error: 'Authentication error' }, 
      { status: 401 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, phone, address, photo } = body;

    // Validate required fields
    if (!fullName || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // Encrypt sensitive data before storing
    const encryptedFullName = encrypt(fullName);
    const encryptedPhone = encrypt(phone);

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: encryptedFullName,
        phone: encryptedPhone,
        address,
        photo,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        ic: true,
        phone: true,
        address: true,
        photo: true,
      },
    });

    // Decrypt user data before returning
    let decryptedEmail = updatedUser.email;
    let decryptedFullName = updatedUser.fullName;
    let decryptedIC = updatedUser.ic;
    let decryptedPhone = updatedUser.phone;

    try {
      decryptedEmail = decrypt(updatedUser.email);
    } catch (error) {
      console.error('Error decrypting email:', error);
    }

    try {
      decryptedFullName = decrypt(updatedUser.fullName);
    } catch (error) {
      console.error('Error decrypting fullName:', error);
    }

    try {
      decryptedIC = decrypt(updatedUser.ic);
    } catch (error) {
      console.error('Error decrypting IC:', error);
    }

    try {
      decryptedPhone = decrypt(updatedUser.phone);
    } catch (error) {
      console.error('Error decrypting phone:', error);
    }

    // Update all family records where this user is referenced
    await prisma.family.updateMany({
      where: {
        ic: updatedUser.ic,
        userId: { not: userId }, // Only update records created by other users
        isRegistered: true,
      },
      data: {
        fullName: encryptedFullName,
        phone: encryptedPhone,
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: decryptedFullName,
      email: decryptedEmail,
      ic: decryptedIC,
      phone: decryptedPhone,
      address: updatedUser.address || '',
      photo: updatedUser.photo || '/images/default-avatar.jpg'
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 