import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

// GET pending agreements for the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all pending signatures where the user is a family member
    const familyIds = (await prisma.family.findMany({
      where: { userId },
      select: { id: true },
    })).map(f => f.id);

    const signatures = await prisma.familySignature.findMany({
      where: {
        status: 'pending',
        familyId: {
          in: familyIds,
        },
      },
      include: {
        agreement: {
          include: {
            distribution: {
              include: {
                asset: {
                  include: {
                    user: true, // Include asset owner information
                  },
                },
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

    // Format response to match old structure for backward compatibility
    const formattedAgreements = signatures.map(signature => {
      // Get the agreement and distribution from the signature
      const { agreement } = signature;
      const { distribution } = agreement;
      
      // Decrypt asset owner information
      let assetOwner = distribution.asset.user;
      try {
        assetOwner = {
          ...assetOwner,
          fullName: decrypt(assetOwner.fullName),
          email: decrypt(assetOwner.email),
          ic: decrypt(assetOwner.ic),
          phone: decrypt(assetOwner.phone),
        };
      } catch (error) {
        console.error('Error decrypting asset owner data:', error);
        // Use original data if decryption fails
      }
      
      // Create a formatted agreement with the old structure
      return {
        id: agreement.id,
        familyId: signature.familyId,
        status: signature.status,
        signedAt: signature.signedAt,
        notes: signature.notes,
        distributionId: distribution.id,
        createdAt: signature.createdAt,
        updatedAt: signature.updatedAt,
        distribution: {
          ...distribution,
          asset: {
            ...distribution.asset,
            user: assetOwner, // Include decrypted owner information
          },
          agreements: agreement.signatures.map(sig => ({
            id: agreement.id,
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
    console.error('Error fetching pending agreements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 