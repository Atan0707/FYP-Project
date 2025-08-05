import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt, encrypt } from '@/services/encryption';
import bcrypt from 'bcryptjs';

// Get all users
export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Decrypt user data before returning to admin
    const decryptedUsers = users.map(user => {
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

      return {
        ...user,
        email: decryptedEmail,
        fullName: decryptedFullName,
        ic: decryptedIC,
        phone: decryptedPhone,
      };
    });

    return NextResponse.json(decryptedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new user
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, fullName, ic, phone, address } = body;

    // Validate required fields
    if (!email || !password || !fullName || !ic || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user with email or IC already exists (need to decrypt stored data)
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        ic: true,
      },
    });

    // Check for duplicates by decrypting stored data
    for (const existingUser of existingUsers) {
      try {
        const decryptedEmail = decrypt(existingUser.email);
        const decryptedIC = decrypt(existingUser.ic);
        
        if (decryptedEmail === email || decryptedIC === ic) {
          return NextResponse.json(
            { error: 'User with this email or IC already exists' },
            { status: 400 }
          );
        }
      } catch {
        // Try unencrypted data for backward compatibility
        if (existingUser.email === email || existingUser.ic === ic) {
          return NextResponse.json(
            { error: 'User with this email or IC already exists' },
            { status: 400 }
          );
        }
      }
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Encrypt sensitive data before storing
    const encryptedEmail = encrypt(email);
    const encryptedFullName = encrypt(fullName);
    const encryptedIC = encrypt(ic);
    const encryptedPhone = encrypt(phone);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: encryptedEmail,
        password: hashedPassword,
        fullName: encryptedFullName,
        ic: encryptedIC,
        phone: encryptedPhone,
        address,
      },
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

    // Return decrypted data to admin
    return NextResponse.json({
      ...newUser,
      email: email,
      fullName: fullName,
      ic: ic,
      phone: phone,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a user
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, email, fullName, ic, phone, address, photo } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Encrypt sensitive data before storing
    const encryptedEmail = encrypt(email);
    const encryptedFullName = encrypt(fullName);
    const encryptedIC = encrypt(ic);
    const encryptedPhone = encrypt(phone);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email: encryptedEmail,
        fullName: encryptedFullName,
        ic: encryptedIC,
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
        createdAt: true,
        updatedAt: true,
      },
    });

    // Update all family records where this user is referenced
    // Update by IC (for family members added before user registration)
    await prisma.family.updateMany({
      where: {
        ic: updatedUser.ic,
        userId: { not: id }, // Only update records created by other users
      },
      data: {
        fullName: encryptedFullName,
        phone: encryptedPhone,
      },
    });

    // Update by relatedUserId (for registered family members)
    await prisma.family.updateMany({
      where: {
        relatedUserId: id,
        userId: { not: id }, // Only update records created by other users
      },
      data: {
        fullName: encryptedFullName,
        phone: encryptedPhone,
      },
    });

    // Update all family invitations where this user is referenced as invitee
    await prisma.familyInvitation.updateMany({
      where: {
        inviteeIC: updatedUser.ic,
        inviterId: { not: id }, // Only update invitations sent by other users
      },
      data: {
        inviteeFullName: encryptedFullName,
        inviteePhone: encryptedPhone,
      },
    });

    // Also update family invitations by inviteeId
    await prisma.familyInvitation.updateMany({
      where: {
        inviteeId: id,
        inviterId: { not: id }, // Only update invitations sent by other users
      },
      data: {
        inviteeFullName: encryptedFullName,
        inviteePhone: encryptedPhone,
      },
    });

    // Return decrypted data to admin
    return NextResponse.json({
      ...updatedUser,
      email: email,
      fullName: fullName,
      ic: ic,
      phone: phone,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a user
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 