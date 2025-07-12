import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notes } = await request.json();
    const distributionId = (await params).id;

    // Find the distribution with its agreement using the new schema
    const distribution = await prisma.assetDistribution.findFirst({
      where: {
        id: distributionId,
        status: 'pending_admin',
      },
      include: {
        asset: true,
        agreement: {
          include: {
            signatures: true,
          },
        },
      },
    });

    if (!distribution || !distribution.agreement) {
      return NextResponse.json(
        { error: 'Distribution not found or not ready for admin signature' },
        { status: 404 }
      );
    }

    // Update the agreement status to completed
    await prisma.agreement.update({
      where: {
        id: distribution.agreement.id,
      },
      data: {
        status: 'completed',
        adminSignedAt: new Date(),
        adminNotes: notes,
      },
    });

    // Update the distribution status to completed
    await prisma.assetDistribution.update({
      where: { id: distributionId },
      data: { status: 'completed' },
    });

    // Get the updated distribution for response
    const updatedDistribution = await prisma.assetDistribution.findFirst({
      where: { id: distributionId },
      include: {
        asset: true,
        agreement: {
          include: {
            signatures: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Agreement signed successfully',
      distribution: updatedDistribution,
    });
  } catch (error) {
    console.error('Error signing agreement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 