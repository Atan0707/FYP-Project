import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET pending admin agreements
export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all asset distributions where:
    // 1. The agreement status is pending_admin
    // 2. All signatures in the agreement are signed
    // 3. Ensure we get only unique distributions by assetId
    const distributions = await prisma.assetDistribution.findMany({
      where: {
        agreement: {
          status: 'pending_admin',
          signatures: {
            every: {
              status: 'signed'
            }
          }
        }
      },
      include: {
        asset: true,
        agreement: {
          include: {
            signatures: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['assetId'], // Add distinct constraint on assetId
    });

    // Transform the data to match the expected interface
    const pendingAdminAgreements = distributions
      .map(distribution => {
        const agreement = distribution.agreement;
        if (!agreement) return null;
        
        // Create a structure that matches the expected interface
        return {
          id: agreement.id,
          status: agreement.status,
          adminSignedAt: agreement.adminSignedAt,
          distributionId: distribution.id,
          createdAt: agreement.createdAt,
          updatedAt: agreement.updatedAt,
          distribution: {
            ...distribution,
            agreements: agreement.signatures.map(sig => ({
              id: sig.id,
              familyId: sig.familyId,
              status: sig.status,
              signedAt: sig.signedAt,
              notes: sig.notes,
              adminSignedAt: agreement.adminSignedAt,
              distributionId: distribution.id,
              createdAt: sig.createdAt,
              updatedAt: sig.updatedAt,
            }))
          }
        };
      })
      .filter(Boolean);

    // Additional check to ensure no duplicate assets in the response
    const uniqueAgreements = Array.from(
      new Map(
        pendingAdminAgreements
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .map(item => [item.distribution.assetId, item])
      ).values()
    );

    return NextResponse.json(uniqueAgreements);
  } catch (error) {
    console.error('Error fetching pending admin agreements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 