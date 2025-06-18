import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// Define interfaces for type safety
interface FormattedAgreement {
  id: string;
  familyId: string;
  status: string;
  signedAt: Date | null;
  notes: string | null;
  adminSignedAt: Date | null;
  distributionId: string;
  createdAt: Date;
  updatedAt: Date;
  familyMember?: {
    id: string;
    fullName: string;
    relationship: string;
  };
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const asset = await prisma.asset.delete({
      where: {
        id: id,
        userId: userId,
      },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error deleting asset:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const id = (await params).id;

    // Check if the user has permission to view this asset
    const hasPermission = await checkPermission(userId, id);

    if (!hasPermission) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: id,
      },
      include: {
        distribution: {
          include: {
            agreement: {
              include: {
                signatures: true
              }
            }
          }
        }
      },
    });

    if (!asset) {
      return new NextResponse('Asset not found', { status: 404 });
    }

    // Format the response to match the old structure for backward compatibility
    let formattedDistribution = null;
    if (asset.distribution) {
      const distribution = asset.distribution;
      let agreements: FormattedAgreement[] = [];
      
      if (distribution.agreement) {
        const agreement = distribution.agreement;
        
        // Get all signature family IDs
        const familyIds = agreement.signatures.map(sig => sig.familyId);
        
        // Fetch family member details for all signatures at once
        const familyMembers = await prisma.family.findMany({
          where: {
            id: {
              in: familyIds
            }
          },
          select: {
            id: true,
            fullName: true,
            relationship: true
          }
        });
        
        // Map signatures to agreements with family member details
        agreements = agreement.signatures.map(signature => {
          const familyMember = familyMembers.find(f => f.id === signature.familyId);
          
          return {
            id: signature.id,
            familyId: signature.familyId,
            status: signature.status,
            signedAt: signature.signedAt,
            notes: signature.notes,
            adminSignedAt: agreement.adminSignedAt,
            distributionId: distribution.id,
            createdAt: signature.createdAt,
            updatedAt: signature.updatedAt,
            familyMember: familyMember || undefined
          };
        });
      }
      
      formattedDistribution = {
        ...distribution,
        agreements,
        agreement: distribution.agreement ? {
          id: distribution.agreement.id,
          status: distribution.agreement.status,
          transactionHash: distribution.agreement.transactionHash
        } : undefined
      };
    }
    
    const formattedAsset = {
      ...asset,
      distribution: formattedDistribution
    };

    return NextResponse.json(formattedAsset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Helper function to check if user has permission to view the asset
async function checkPermission(userId: string, assetId: string) {
  // Check if the user owns the asset
  const ownedAsset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      userId,
    },
  });

  if (ownedAsset) return true;

  // Check if the user is related to the asset owner as a family member
  const asset = await prisma.asset.findFirst({
    where: { id: assetId },
    select: { userId: true },
  });

  if (!asset) return false;

  const familyRelation = await prisma.family.findFirst({
    where: {
      OR: [
        // User is a family member of the asset owner
        {
          userId: asset.userId,
          relatedUserId: userId,
        },
        // User has the asset owner as a family member
        {
          userId: userId,
          relatedUserId: asset.userId,
        },
      ],
    },
  });

  return !!familyRelation;
} 