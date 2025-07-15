import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

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