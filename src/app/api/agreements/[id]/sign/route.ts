import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { FamilySignature } from '@prisma/client';
import { sendAgreementSigningNotification } from '@/services/agreementEmailService';
import { decrypt } from '@/services/encryption';

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

    // First check if the agreement exists
    const agreementExists = await prisma.agreement.findUnique({
      where: { id: agreementId }
    });

    if (!agreementExists) {
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Get user details for the signer
    const signerUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true }
    });

    if (!signerUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Decrypt user fullName for notifications
    let decryptedFullName = signerUser.fullName;
    try {
      decryptedFullName = decrypt(signerUser.fullName);
    } catch (error) {
      console.error('Error decrypting user fullName:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    // Find the pending signature for this agreement and user
    // First get all family IDs where the user is a family member
    const familyIds = (await prisma.family.findMany({
      where: { userId },
      select: { id: true, relationship: true },
    })).map(f => ({ id: f.id, relationship: f.relationship }));

    // Then find the signature for this agreement where the user is a family member
    const signature = await prisma.familySignature.findFirst({
      where: {
        agreementId: agreementId,
        familyId: {
          in: familyIds.map(f => f.id),
        },
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

    // Get the relationship of the signer
    const signerFamily = familyIds.find(f => f.id === signature.familyId);
    const signerRelationship = signerFamily?.relationship || 'Family Member';

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

    // Send notification emails to other family members using decrypted name
    try {
      await sendAgreementSigningNotification(
        agreementId,
        decryptedFullName,
        signerRelationship
      );
      console.log('Agreement signing notification emails sent successfully');
    } catch (emailError) {
      console.error('Error sending agreement signing notification emails:', emailError);
      // Don't fail the main request if email fails
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