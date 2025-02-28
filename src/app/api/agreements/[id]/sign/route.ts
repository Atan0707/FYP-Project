import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notes } = await request.json();

    // Find the agreement and verify ownership
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: (await params).id,
        familyId: {
          in: (await prisma.family.findMany({
            where: { userId },
            select: { id: true },
          })).map(f => f.id),
        },
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
        { error: 'Agreement not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update the agreement status
    const updatedAgreement = await prisma.agreement.update({
      where: { id: (await params).id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        notes,
      },
    });

    // Check if all family members have signed
    const agreementId = (await params).id;
    const allSigned = agreement.distribution.agreements.every(
      (a) => a.id === agreementId || a.status === 'signed'
    );

    if (allSigned) {
      // Update all agreements to pending_admin status
      await prisma.agreement.updateMany({
        where: { distributionId: agreement.distribution.id },
        data: { status: 'pending_admin' },
      });

      // Update the distribution status to pending_admin
      await prisma.assetDistribution.update({
        where: { id: agreement.distribution.id },
        data: { status: 'pending_admin' },
      });
    }

    return NextResponse.json(updatedAgreement);
  } catch (error) {
    console.error('Error signing agreement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 