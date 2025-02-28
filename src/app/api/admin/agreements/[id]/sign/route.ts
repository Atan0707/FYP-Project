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

    // Find the agreement and its distribution
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: (await params).id,
        status: 'pending_admin',
      },
      include: {
        distribution: {
          include: {
            agreements: true,
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found or not ready for admin signature' },
        { status: 404 }
      );
    }

    // Update all agreements in the distribution to completed
    await prisma.agreement.updateMany({
      where: {
        distributionId: agreement.distribution.id,
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
      where: { id: agreement.distribution.id },
      data: { status: 'completed' },
    });

    // Get the updated agreement for response
    const updatedAgreement = await prisma.agreement.findFirst({
      where: { id: (await params).id },
      include: {
        distribution: {
          include: {
            asset: true,
            agreements: true,
          },
        },
      },
    });

    return NextResponse.json(updatedAgreement);
  } catch (error) {
    console.error('Error signing agreement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 