'use server';

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { decrypt } from '../pages/_lib/session';

const prisma = new PrismaClient();

export async function getCurrentUser() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) return null;
  
  const session = await decrypt(sessionCookie);
  if (!session?.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { 
        id: session.userId as string 
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        ic: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
} 