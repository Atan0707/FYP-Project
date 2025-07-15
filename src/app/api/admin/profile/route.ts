import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { decrypt, encrypt } from '@/services/encryption';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get admin ID from cookie
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;
    
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find admin by ID
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Decrypt username before returning
    let decryptedUsername = admin.username;
    try {
      decryptedUsername = decrypt(admin.username);
    } catch (error) {
      console.error('Error decrypting admin username:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    // Return in consistent format
    return NextResponse.json({ 
      admin: {
        id: admin.id,
        username: decryptedUsername,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      } 
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    // Get admin ID from cookie
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;
    
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { username, currentPassword, newPassword } = body;

    // Find current admin
    const currentAdmin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!currentAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Validate required fields
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // If password change is requested, validate current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        );
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, currentAdmin.password);
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    }

    // Check if username is taken by another admin (only if username is being changed)
    let currentDecryptedUsername = currentAdmin.username;
    try {
      currentDecryptedUsername = decrypt(currentAdmin.username);
    } catch (error) {
      console.error('Error decrypting current admin username:', error);
    }

    // Prevent root admin from changing username
    if (currentDecryptedUsername === 'admin' && username !== currentDecryptedUsername) {
      return NextResponse.json(
        { error: 'Root admin username cannot be changed for security reasons' },
        { status: 403 }
      );
    }

    if (username !== currentDecryptedUsername) {
      // Check if new username already exists
      const allAdmins = await prisma.admin.findMany({
        where: {
          id: {
            not: adminId
          }
        },
        select: {
          username: true
        }
      });

      const usernameExists = allAdmins.some(admin => {
        try {
          const decryptedUsername = decrypt(admin.username);
          return decryptedUsername === username;
        } catch {
          // If decryption fails, compare directly (for backward compatibility)
          return admin.username === username;
        }
      });

      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: { username?: string; password?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    // Encrypt username if it's being changed
    if (username !== currentDecryptedUsername) {
      updateData.username = encrypt(username);
    }

    // Hash new password if provided
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Update admin
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Return decrypted data
    return NextResponse.json({
      admin: {
        id: updatedAdmin.id,
        username: username, // Return the plaintext username
        createdAt: updatedAdmin.createdAt,
        updatedAt: updatedAdmin.updatedAt
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 