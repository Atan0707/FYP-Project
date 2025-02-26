import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

interface Beneficiary {
  familyId: string;
  percentage: number;
}

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

    // Start a transaction to create distribution and agreements
    const result = await prisma.$transaction(async (tx) => {
      // Create the asset distribution
      const distribution = await tx.assetDistribution.create({
        data: {
          type: body.type,
          notes: body.notes,
          status: 'in_progress',
          beneficiaries: body.beneficiaries,
          organization: body.organization,
          assetId: body.assetId,
        },
      });

      // If there are beneficiaries, create agreements for each
      if (body.beneficiaries && Array.isArray(body.beneficiaries)) {
        const beneficiaryIds = body.beneficiaries.map((b: Beneficiary) => b.familyId);
        
        // Create agreements for each beneficiary
        await Promise.all(
          beneficiaryIds.map((familyId: string) =>
            tx.agreement.create({
              data: {
                familyId,
                status: 'pending',
                distributionId: distribution.id,
              },
            })
          )
        );
      }

      return distribution;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating asset distribution:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
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