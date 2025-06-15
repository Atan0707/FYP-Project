import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { FamilySignature } from '@prisma/client';

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
    const agreementId = (await params).id;

    // Find the user's family IDs
    const familyIds = (await prisma.family.findMany({
      where: { userId },
      select: { id: true },
    })).map(f => f.id);

    if (familyIds.length === 0) {
      return NextResponse.json(
        { error: 'No family members found for this user' },
        { status: 404 }
      );
    }

    // Find the pending signature for this agreement and user's family
    const signature = await prisma.familySignature.findFirst({
      where: {
        agreementId: agreementId,
        familyId: { in: familyIds },
        status: 'pending',
      },
      include: {
        agreement: {
          include: {
            distribution: {
              include: {
                asset: true,
              },
            },
            signatures: true,
          },
        },
      },
    });

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature not found or already signed' },
        { status: 404 }
      );
    }

    // Update the signature
    const updatedSignature = await prisma.familySignature.update({
      where: { id: signature.id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        notes,
      },
      include: {
        agreement: {
          include: {
            distribution: {
              include: {
                asset: true,
              },
            },
            signatures: true,
          },
        },
      },
    });

    // Check if all signatures are now signed
    const allSignatures = updatedSignature.agreement.signatures;
    const allSigned = allSignatures.every((sig: FamilySignature) => sig.status === 'signed');

    if (allSigned) {
      // Update the agreement status to pending_admin
      await prisma.agreement.update({
        where: { id: updatedSignature.agreement.id },
        data: { status: 'pending_admin' },
      });

      // Update the distribution status to pending_admin
      await prisma.assetDistribution.update({
        where: { id: updatedSignature.agreement.distribution.id },
        data: { status: 'pending_admin' },
      });
    }

    return NextResponse.json(updatedSignature);
  } catch (error) {
    console.error('Error signing agreement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 