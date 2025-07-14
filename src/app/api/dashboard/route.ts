import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
      },
    });

    // Decrypt user data
    let decryptedFullName = user?.fullName || '';
    let decryptedEmail = user?.email || '';

    if (user) {
      try {
        decryptedFullName = decrypt(user.fullName);
      } catch (error) {
        console.error('Error decrypting user fullName:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      try {
        decryptedEmail = decrypt(user.email);
      } catch (error) {
        console.error('Error decrypting user email:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }
    }

    // Get family members count
    const familyCount = await prisma.family.count({
      where: { userId },
    });

    // Get assets count and total value
    const assets = await prisma.asset.findMany({
      where: { userId },
      select: {
        value: true,
      },
    });
    
    const assetsCount = assets.length;
    const totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0);

    // Get recent family members (last 5)
    const recentFamilyRaw = await prisma.family.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        relationship: true,
        createdAt: true,
      },
    });

    // Decrypt family member names
    const recentFamily = recentFamilyRaw.map(member => {
      let decryptedFullName = member.fullName;
      
      try {
        decryptedFullName = decrypt(member.fullName);
      } catch (error) {
        console.error('Error decrypting family member fullName:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }

      return {
        ...member,
        fullName: decryptedFullName,
      };
    });

    // Get recent assets (last 5)
    const recentAssets = await prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        type: true,
        value: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: {
        fullName: decryptedFullName,
        email: decryptedEmail,
      },
      stats: {
        familyCount,
        assetsCount,
        totalAssetValue,
      },
      recentFamily,
      recentAssets,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 