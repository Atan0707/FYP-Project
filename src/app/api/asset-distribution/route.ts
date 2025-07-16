import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { sendAgreementCreationNotifications } from '@/services/agreementEmailService';

// GET all asset distributions for the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all assets with their distributions for the current user
    const assetsWithDistributions = await prisma.asset.findMany({
      where: {
        userId: userId,
      },
      include: {
        distribution: true,
      },
    });

    // console.log('Assets with distributions:', assetsWithDistributions);
    return NextResponse.json(assetsWithDistributions);
  } catch (error) {
    console.error('Error fetching asset distributions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST a new asset distribution
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    
    // Verify that the asset belongs to the current user
    const asset = await prisma.asset.findFirst({
      where: {
        id: body.assetId,
        userId: userId,
      },
    });

    if (!asset) {
      return new NextResponse('Asset not found or does not belong to the current user', { status: 404 });
    }

    // Check if the asset already has a distribution
    const existingDistribution = await prisma.assetDistribution.findUnique({
      where: {
        assetId: body.assetId,
      },
    });

    if (existingDistribution) {
      return new NextResponse('Asset already has a distribution', { status: 400 });
    }

    // Get all family members (both direct and related)
    const allFamilyMembers = await prisma.family.findMany({
      where: {
        OR: [
          { userId }, // Direct family members
          { relatedUserId: userId }, // Related family members
        ],
      },
    });

    // Filter out the asset owner from family members to avoid duplicate agreements
    const familyMembersWithoutOwner = allFamilyMembers.filter(
      member => member.userId !== userId && member.relatedUserId === userId
    );

    console.log('Found family members:', allFamilyMembers.length);
    console.log('Family members to sign (excluding owner):', familyMembersWithoutOwner.length);

    // Start a transaction to create distribution and agreements
    const result = await prisma.$transaction(async (tx) => {
      // If there are no family members, we need to create a temporary family record for the owner
      let ownerFamilyId = '';
      
      if (allFamilyMembers.length === 0) {
        // Get the current user's details
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: { fullName: true, ic: true, phone: true },
        });
        
        if (!currentUser) {
          throw new Error('Current user not found');
        }
        
        // Create a family record for the owner
        const ownerFamily = await tx.family.create({
          data: {
            fullName: currentUser.fullName,
            ic: currentUser.ic,
            relationship: 'Owner',
            phone: currentUser.phone || '',
            userId: userId,
            isRegistered: true,
          },
        });
        
        ownerFamilyId = ownerFamily.id;
      }

      // Create the asset distribution
      const distribution = await tx.assetDistribution.create({
        data: {
          type: body.type,
          notes: body.notes,
          status: allFamilyMembers.length === 0 ? 'pending' : 'in_progress', // Set to pending if no family members
          beneficiaries: body.beneficiaries,
          organization: body.organization,
          assetId: body.assetId,
          // Create a single agreement for the distribution with family signatures
          agreement: {
            create: {
              status: 'pending',
              // Create family signatures
              signatures: {
                create: allFamilyMembers.length === 0 ? [
                  // Create signature for the owner only if no family members
                  {
                    familyId: ownerFamilyId,
                    status: 'pending',
                    signedById: userId,
                  }
                ] : [
                  // Create signature for the asset owner
                  {
                    familyId: allFamilyMembers.find(member => member.userId === userId)?.id || '',
                    status: 'pending',
                    signedById: userId,
                  },
                  // Create signatures for family members (excluding owner)
                  ...familyMembersWithoutOwner.map((familyMember) => ({
                    familyId: familyMember.id,
                    status: 'pending',
                    signedById: familyMember.relatedUserId || userId,
                  })),
                ],
              },
            },
          },
        },
        include: {
          agreement: {
            include: {
              signatures: true,
            },
          },
        },
      });

      return distribution;
    });

    // Send notification emails to all signers after successful agreement creation
    if (result.agreement) {
      try {
        await sendAgreementCreationNotifications(result.agreement.id);
        console.log('Agreement creation notifications sent successfully');
      } catch (emailError) {
        console.error('Failed to send agreement creation notifications:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating asset distribution:', error);
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return new NextResponse(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// PUT to update an existing asset distribution
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    
    // Verify that the asset belongs to the current user
    const asset = await prisma.asset.findFirst({
      where: {
        id: body.assetId,
        userId: userId,
      },
    });

    if (!asset) {
      return new NextResponse('Asset not found or does not belong to the current user', { status: 404 });
    }

    // Update the asset distribution
    const assetDistribution = await prisma.assetDistribution.update({
      where: {
        id: body.id,
      },
      data: {
        type: body.type,
        notes: body.notes,
        beneficiaries: body.beneficiaries,
        organization: body.organization,
      },
    });

    return NextResponse.json(assetDistribution);
  } catch (error) {
    console.error('Error updating asset distribution:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 