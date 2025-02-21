import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { AuthOptions } from 'next-auth'

const prisma = new PrismaClient();

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  
  if (!userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });
    
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// Configure your auth providers here
export const authOptions: AuthOptions = {
  // Add your auth configuration
  providers: [
    // Add providers like Google, GitHub, etc.
  ],
  // Add other options as needed
}