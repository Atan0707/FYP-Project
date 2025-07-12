import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { FamilySignature } from '@prisma/client';

// GET all agreements for admin
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

    // If family info is requested, fetch it separately to avoid TypeScript errors
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
          dist.beneficiaries.forEach((ben: any) => {
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
      const convertedAgreements = agreement.signatures.map((signature: FamilySignature) => {
        const result = {
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
        };
        
        // Add family info if requested and available
        if (includeFamilyInfo && familyInfo[signature.familyId]) {
          return {
            ...result,
            family: familyInfo[signature.familyId]
          };
        }
        
        return result;
      });
      
      // Process beneficiaries if they exist and family info is requested
      let processedDistribution = { ...distribution };
      if (includeFamilyInfo && distribution.beneficiaries && Array.isArray(distribution.beneficiaries)) {
        processedDistribution = {
          ...distribution,
          beneficiaries: distribution.beneficiaries.map((ben: any) => {
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
      
      // Return the agreement data with the full distribution data
      return {
        id: agreement.id, // Use agreement ID instead of signature ID
        status: status,
        distributionId: distribution.id,
        createdAt: agreement.createdAt,
        updatedAt: agreement.updatedAt,
        distribution: {
          ...processedDistribution,
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