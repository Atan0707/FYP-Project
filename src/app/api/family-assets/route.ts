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

    // Get all registered family members
    const registeredFamilyMembers = await prisma.family.findMany({
      where: {
        userId: userId,
        isRegistered: true,
        relatedUserId: { not: null },
      },
      select: {
        id: true,
        fullName: true,
        relationship: true,
        relatedUserId: true,
      },
    });

    // If no registered family members, return empty array
    if (registeredFamilyMembers.length === 0) {
      return NextResponse.json([]);
    }

    // Get assets for each family member
    const familyAssets = await Promise.all(
      registeredFamilyMembers.map(async (member) => {
        if (!member.relatedUserId) return null;

        const assets = await prisma.asset.findMany({
          where: {
            userId: member.relatedUserId,
          },
          select: {
            id: true,
            name: true,
            type: true,
            value: true,
            description: true,
            pdfFile: true,
            createdAt: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        });

        return {
          familyMember: {
            id: member.id,
            fullName: member.fullName,
            relationship: member.relationship,
          },
          assets,
        };
      })
    );

    // Filter out null values and return
    return NextResponse.json(familyAssets.filter(Boolean));
  } catch (error) {
    console.error('Error fetching family assets:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 