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

    // Find the distribution and its agreements
    const distribution = await prisma.assetDistribution.findFirst({
      where: {
        id: distributionId,
        status: 'pending_admin',
      },
      include: {
        agreements: {
          where: {
            status: 'pending_admin',
          },
        },
        asset: true,
      },
    });

    if (!distribution) {
      return NextResponse.json(
        { error: 'Distribution not found or not ready for admin signature' },
        { status: 404 }
      );
    }

    if (distribution.agreements.length === 0) {
      return NextResponse.json(
        { error: 'No pending agreements found for this distribution' },
        { status: 400 }
      );
    }

    // Update all agreements in the distribution to completed
    await prisma.agreement.updateMany({
      where: {
        distributionId: distributionId,
        status: 'pending_admin',
      },
      data: {
        status: 'completed',
        adminSignedAt: new Date(),
        notes: notes ? `[Admin] ${notes}` : undefined,
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
        agreements: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All agreements signed successfully',
      distribution: updatedDistribution,
    });
  } catch (error) {
    console.error('Error signing agreements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 