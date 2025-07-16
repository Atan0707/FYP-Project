import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/services/encryption';

// GET endpoint to fetch a specific agreement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agreement = await prisma.agreement.findUnique({
      where: { id: (await params).id },
      include: {
        distribution: {
          include: {
            asset: true,
          },
        },
        signatures: {
          include: {
            signedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Decrypt user data in signatures
    const decryptedAgreement = {
      ...agreement,
      signatures: agreement.signatures.map(signature => {
        let decryptedUser = signature.signedBy;
        
        if (signature.signedBy) {
          try {
            decryptedUser = {
              ...signature.signedBy,
              fullName: decrypt(signature.signedBy.fullName),
              email: decrypt(signature.signedBy.email),
            };
          } catch (error) {
            console.error('Error decrypting user data in signature:', error);
            // Use as-is if decryption fails (for backward compatibility)
            decryptedUser = signature.signedBy;
          }
        }
        
        return {
          ...signature,
          signedBy: decryptedUser,
        };
      }),
    };

    return NextResponse.json(decryptedAgreement);
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agreement' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update an agreement
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json();
    const agreementId = (await params).id;
    
    console.log('PATCH /api/agreements/[id] - Agreement ID:', agreementId);
    console.log('PATCH /api/agreements/[id] - Data to update:', data);
    
    // First check if the agreement exists
    const existingAgreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
    });
    
    if (!existingAgreement) {
      console.error('Agreement not found:', agreementId);
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }
    
    console.log('Existing agreement found:', existingAgreement);
    
    // Update the agreement with the provided data
    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        ...data,
      },
    });

    console.log('Agreement updated successfully:', updatedAgreement);
    return NextResponse.json(updatedAgreement);
  } catch (error) {
    console.error('Error updating agreement:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Failed to update agreement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 