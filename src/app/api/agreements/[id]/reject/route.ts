import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notes } = await request.json();

    if (!notes) {
      return NextResponse.json(
        { error: 'Notes are required when rejecting an agreement' },
        { status: 400 }
      );
    }

    // Find the agreement and verify ownership
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: params.id,
        familyId: {
          in: (await prisma.family.findMany({
            where: { userId },
            select: { id: true },
          })).map(f => f.id),
        },
      },
      include: {
        distribution: true,
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update the agreement status
    const updatedAgreement = await prisma.agreement.update({
      where: { id: params.id },
      data: {
        status: 'rejected',
        notes,
      },
    });

    // Update the distribution status to rejected
    await prisma.assetDistribution.update({
      where: { id: agreement.distribution.id },
      data: { status: 'rejected' },
    });

    return NextResponse.json(updatedAgreement);
  } catch (error) {
    console.error('Error rejecting agreement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 