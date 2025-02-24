'use server'

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function adminLogin(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'All fields are required' };
  }

  try {
    // Find admin by username
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return { error: 'Invalid credentials' };
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return { error: 'Invalid credentials' };
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('adminId', admin.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Something went wrong during login' };
  }
} 