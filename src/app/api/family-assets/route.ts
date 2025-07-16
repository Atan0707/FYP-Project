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

        // Decrypt family member name
        let decryptedFamilyMemberName = member.fullName;
        try {
          decryptedFamilyMemberName = decrypt(member.fullName);
        } catch (error) {
          console.error('Error decrypting family member fullName:', error);
          // Use as-is if decryption fails (for backward compatibility)
        }

        // Decrypt user fullNames in assets
        const decryptedAssets = assets.map(asset => {
          let decryptedUserFullName = asset.user.fullName;
          try {
            decryptedUserFullName = decrypt(asset.user.fullName);
          } catch (error) {
            console.error('Error decrypting asset user fullName:', error);
            // Use as-is if decryption fails (for backward compatibility)
          }

          return {
            ...asset,
            user: {
              ...asset.user,
              fullName: decryptedUserFullName,
            },
          };
        });

        return {
          familyMember: {
            id: member.id,
            fullName: decryptedFamilyMemberName,
            relationship: member.relationship,
          },
          assets: decryptedAssets,
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