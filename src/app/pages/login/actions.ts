'use server';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createSession } from '../_lib/session';

const prisma = new PrismaClient();

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
    await createSession(user.id);

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