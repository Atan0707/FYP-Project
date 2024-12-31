'use server';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { encrypt } from '../_lib/session';

const prisma = new PrismaClient();

const cookie = {
  name: 'session',
  option: {
      httpOnly: true, 
      secure: true, 
      sameSite: 'lax' as const, 
      path: '/'
  },
  duration: 2 * 60 * 60 * 1000,
};

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: 'Invalid email or password' };
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return { error: 'Invalid email or password' };
    }

    // Create session
    const expires = new Date(Date.now() + cookie.duration);
    const session = await encrypt({ userId: user.id, expires });
    (await cookies()).set(cookie.name, session, { ...cookie.option, expires });

    return { 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      }
    };
  } catch (error) {
    console.error('Error during login:', error);
    return { error: 'Something went wrong during login' };
  }
} 