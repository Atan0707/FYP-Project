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

    const { notes, transactionHash } = await request.json();
    const agreementId = (await params).id;

    console.log('Sign agreement request:', {
      userId,
      agreementId,
      notes,
      transactionHash: transactionHash ? 'present' : 'missing'
    });

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
    console.log('Updating signature with data:', {
      id: signature.id,
      status: 'signed',
      signedAt: new Date(),
      notes,
      transactionHash,
      signedById: userId,
    });

    const updatedSignature = await prisma.familySignature.update({
      where: { id: signature.id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        notes,
        transactionHash,
        signedById: userId,
      },
    });

    // Get updated agreement with all signatures to check completion status
    const updatedAgreement = await prisma.agreement.findUnique({
      where: { id: signature.agreementId },
      include: {
        distribution: {
          include: {
            asset: true,
          },
        },
        signatures: true,
      },
    });

    if (!updatedAgreement) {
      throw new Error('Agreement not found after update');
    }

    // Check if all signatures are now signed
    const allSignatures = updatedAgreement.signatures;
    const allSigned = allSignatures.every((sig: FamilySignature) => sig.status === 'signed');

    if (allSigned) {
      // Update the agreement status to pending_admin
      await prisma.agreement.update({
        where: { id: updatedAgreement.id },
        data: { status: 'pending_admin' },
      });

      // Update the distribution status to pending_admin
      await prisma.assetDistribution.update({
        where: { id: updatedAgreement.distribution.id },
        data: { status: 'pending_admin' },
      });
    }

    return NextResponse.json({
      ...updatedSignature,
      agreement: updatedAgreement
    });
  } catch (error) {
    console.error('Error signing agreement:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 