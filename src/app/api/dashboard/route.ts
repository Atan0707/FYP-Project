import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

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
    const recentFamily = await prisma.family.findMany({
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
      user,
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