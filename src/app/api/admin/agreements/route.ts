import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { FamilySignature } from '@prisma/client';

// GET all agreements for admin
export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all asset distributions with their agreements and signatures
    const distributions = await prisma.assetDistribution.findMany({
      include: {
        asset: true,
        agreement: {
          include: {
            signatures: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response to be compatible with the existing frontend
    const formattedAgreements = distributions.map(distribution => {
      const agreement = distribution.agreement;
      
      if (!agreement) {
        // If there's no agreement, create a placeholder with default values
        return {
          id: `placeholder-${distribution.id}`,
          status: distribution.status,
          distributionId: distribution.id,
          createdAt: distribution.createdAt,
          updatedAt: distribution.updatedAt,
          distribution: {
            ...distribution,
            agreements: [],
          },
        };
      }
      
      // Use the agreement's status or the distribution's status
      const status = agreement.status || distribution.status;
      
      // Convert the signatures to the old agreement format for backward compatibility
      const convertedAgreements = agreement.signatures.map((signature: FamilySignature) => ({
        id: signature.id,
        familyId: signature.familyId,
        status: signature.status === 'signed' ? 
               (status === 'completed' ? 'completed' : 'pending_admin') : 
               signature.status,
        signedAt: signature.signedAt,
        notes: signature.notes,
        adminSignedAt: agreement.adminSignedAt,
        distributionId: distribution.id,
        createdAt: signature.createdAt,
        updatedAt: signature.updatedAt,
      }));
      
      // Return the agreement data with the full distribution data
      return {
        id: agreement.id, // Use agreement ID instead of signature ID
        status: status,
        distributionId: distribution.id,
        createdAt: agreement.createdAt,
        updatedAt: agreement.updatedAt,
        distribution: {
          ...distribution,
          // Include all converted agreements for backward compatibility
          agreements: convertedAgreements,
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