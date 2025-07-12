import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET pending admin agreements
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;
    
    // Parse the URL to get query parameters
    const url = new URL(request.url);
    const includeFamilyInfo = url.searchParams.get('includeFamilyInfo') === 'true';

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

    // If family info is requested, fetch it separately
    let familyInfo: Record<string, { id: string; name: string }> = {};
    if (includeFamilyInfo) {
      // Get all family IDs from agreements
      const familyIds = new Set<string>();
      distributions.forEach(dist => {
        if (dist.agreement?.signatures) {
          dist.agreement.signatures.forEach((sig) => {
            if (sig.familyId) {
              familyIds.add(sig.familyId);
            }
          });
        }
        
        // Also add beneficiary family IDs if they exist
        if (dist.beneficiaries && Array.isArray(dist.beneficiaries)) {
          dist.beneficiaries.forEach((ben: Record<string, any>) => {
            if (ben.familyId) {
              familyIds.add(ben.familyId);
            }
          });
        }
      });
      
      // Fetch family info for all these IDs
      if (familyIds.size > 0) {
        const families = await prisma.family.findMany({
          where: {
            id: {
              in: Array.from(familyIds)
            }
          },
          select: {
            id: true,
            fullName: true
          }
        });
        
        // Create a map for easy lookup and transform fullName to name for UI consistency
        familyInfo = families.reduce((acc: Record<string, { id: string; name: string }>, family) => {
          acc[family.id] = {
            id: family.id,
            name: family.fullName // Map fullName to name for UI consistency
          };
          return acc;
        }, {});
      }
    }

    // Transform the data to match the expected interface
    const pendingAdminAgreements = distributions
      .map(distribution => {
        const agreement = distribution.agreement;
        if (!agreement) return null;
        
        // Process beneficiaries if they exist and family info is requested
        let processedDistribution = { ...distribution };
        if (includeFamilyInfo && distribution.beneficiaries && Array.isArray(distribution.beneficiaries)) {
          processedDistribution = {
            ...distribution,
            beneficiaries: distribution.beneficiaries.map((ben: Record<string, any>) => {
              if (ben.familyId && familyInfo[ben.familyId]) {
                return {
                  ...ben,
                  family: familyInfo[ben.familyId]
                };
              }
              return ben;
            })
          };
        }
        
        // Create a structure that matches the expected interface
        return {
          id: agreement.id,
          status: agreement.status,
          adminSignedAt: agreement.adminSignedAt,
          distributionId: distribution.id,
          createdAt: agreement.createdAt,
          updatedAt: agreement.updatedAt,
          distribution: {
            ...processedDistribution,
            agreements: agreement.signatures.map((sig) => {
              const result = {
                id: sig.id,
                familyId: sig.familyId,
                status: sig.status,
                signedAt: sig.signedAt,
                notes: sig.notes,
                adminSignedAt: agreement.adminSignedAt,
                distributionId: distribution.id,
                createdAt: sig.createdAt,
                updatedAt: sig.updatedAt,
              };
              
              // Add family info if requested and available
              if (includeFamilyInfo && sig.familyId && familyInfo[sig.familyId]) {
                return {
                  ...result,
                  family: familyInfo[sig.familyId]
                };
              }
              
              return result;
            })
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