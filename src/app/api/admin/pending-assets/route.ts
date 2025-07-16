import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingAssets = await prisma.pendingAsset.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Decrypt user data before returning
    const decryptedPendingAssets = pendingAssets.map(asset => {
      let decryptedFullName = asset.user.fullName;
      let decryptedEmail = asset.user.email;

      try {
        decryptedFullName = decrypt(asset.user.fullName);
      } catch (error) {
        console.error('Error decrypting user fullName:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedEmail = decrypt(asset.user.email);
      } catch (error) {
        console.error('Error decrypting user email:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      return {
        ...asset,
        user: {
          ...asset.user,
          fullName: decryptedFullName,
          email: decryptedEmail,
        },
      };
    });

    return NextResponse.json(decryptedPendingAssets);
  } catch (error) {
    console.error('Error fetching pending assets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 