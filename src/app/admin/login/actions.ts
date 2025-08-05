'use server'

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

const prisma = new PrismaClient();

export async function adminLogin(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'All fields are required' };
  }

  try {
    // Find all admins and decrypt usernames to find match
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        password: true,
      }
    });

    let admin = null;
    for (const adminRecord of admins) {
      try {
        const decryptedUsername = decrypt(adminRecord.username);
        if (decryptedUsername === username) {
          admin = adminRecord;
          break;
        }
      } catch {
        // Handle case where username might not be encrypted (backward compatibility)
        if (adminRecord.username === username) {
          admin = adminRecord;
          break;
        }
      }
    }

    if (!admin) {
      return { error: 'Invalid credentials' };
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return { error: 'Invalid credentials' };
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('adminId', admin.id, {
      httpOnly: false, // Allow JavaScript access
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 , // 1 day
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Something went wrong during login' + error };
  }
} 