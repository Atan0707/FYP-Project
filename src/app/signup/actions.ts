'use server';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const ic = formData.get('ic') as string;
  const phone = formData.get('phone') as string;

  if (!email || !password || !fullName || !ic || !phone) {
    return { error: 'All fields are required' };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { ic }
        ]
      }
    });

    if (existingUser) {
      return { error: 'User already exists with this email or IC' };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        ic,
        phone,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error during signup:', error);
    return { error: 'Something went wrong during signup' };
  }
}
