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

    const { reason } = await request.json();
    
    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }
    
    const distributionId = (await params).id;

    // Find the distribution and its agreements
    const distribution = await prisma.assetDistribution.findFirst({
      where: {
        id: distributionId,
        status: 'pending_admin',
      },
      include: {
        agreement: {
          where: {
            status: 'pending_admin',
          },
        },
        asset: true,
      },
    });

    if (!distribution) {
      return NextResponse.json(
        { error: 'Distribution not found or not ready for admin action' },
        { status: 404 }
      );
    }

    if (!distribution.agreement) {
      return NextResponse.json(
        { error: 'No pending agreements found for this distribution' },
        { status: 400 }
      );
    }

    // Update all agreements in the distribution to rejected
    await prisma.agreement.updateMany({
      where: {
        distributionId: distributionId,
        status: 'pending_admin',
      },
      data: {
        status: 'rejected',
        adminNotes: `[Admin Rejected] ${reason}`,
      },
    });

    // Update the distribution status to rejected
    await prisma.assetDistribution.update({
      where: { id: distributionId },
      data: { status: 'rejected' },
    });

    // Get the updated distribution for response
    const updatedDistribution = await prisma.assetDistribution.findFirst({
      where: { id: distributionId },
      include: {
        asset: true,
        agreement: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All agreements rejected successfully',
      distribution: updatedDistribution,
    });
  } catch (error) {
    console.error('Error rejecting agreements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 