import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { AuthOptions } from 'next-auth';
import { decrypt } from '@/services/encryption';

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

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const adminId = cookieStore.get('adminId')?.value;
  
  if (!adminId) {
    return null;
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
      },
    });
    
    if (!admin) {
      return null;
    }

    // Decrypt username before returning
    let decryptedUsername = admin.username;
    try {
      decryptedUsername = decrypt(admin.username);
    } catch (error) {
      console.error('Error decrypting admin username:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    return {
      ...admin,
      username: decryptedUsername
    };
  } catch (error) {
    console.error('Error fetching admin:', error);
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