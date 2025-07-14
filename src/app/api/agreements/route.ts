import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

// GET all agreements for the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all signatures where the user is a family member
    const familyIds = (await prisma.family.findMany({
      where: { userId },
      select: { id: true },
    })).map(f => f.id);

    const signatures = await prisma.familySignature.findMany({
      where: {
        familyId: {
          in: familyIds,
        },
      },
      include: {
        agreement: {
          include: {
            distribution: {
              include: {
                asset: true,
              },
            },
            signatures: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get family data separately to decrypt names
    const familyData = await prisma.family.findMany({
      where: {
        id: {
          in: familyIds,
        },
      },
      select: {
        id: true,
        fullName: true,
      },
    });

    // Create a map of family ID to decrypted name
    const familyNameMap: Record<string, string> = {};
    familyData.forEach(family => {
      try {
        familyNameMap[family.id] = decrypt(family.fullName);
      } catch (error) {
        console.error('Error decrypting family fullName:', error);
        // Use as-is if decryption fails (for backward compatibility)
        familyNameMap[family.id] = family.fullName;
      }
    });

    // Format response to match old structure for backward compatibility
    const formattedAgreements = signatures.map(signature => {
      // Get the agreement and distribution from the signature
      const { agreement } = signature;
      const { distribution } = agreement;
      
      // Get decrypted family name
      const decryptedFamilyName = familyNameMap[signature.familyId] || '';
      
      // Create a formatted agreement with the old structure
      return {
        id: signature.id,
        familyId: signature.familyId,
        status: signature.status,
        signedAt: signature.signedAt,
        notes: signature.notes,
        distributionId: distribution.id,
        createdAt: signature.createdAt,
        updatedAt: signature.updatedAt,
        familyName: decryptedFamilyName, // Add decrypted family name
        distribution: {
          ...distribution,
          agreements: agreement.signatures.map((sig) => ({
            id: sig.id,
            familyId: sig.familyId,
            status: sig.status,
            signedAt: sig.signedAt,
            notes: sig.notes,
            signedById: sig.signedById,
            adminSignedAt: agreement.adminSignedAt,
            distributionId: distribution.id,
            createdAt: sig.createdAt,
            updatedAt: sig.updatedAt,
          })),
        },
      };
    });

    return NextResponse.json(formattedAgreements);
  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 