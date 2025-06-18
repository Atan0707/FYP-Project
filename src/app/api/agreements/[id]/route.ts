import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET endpoint to fetch a specific agreement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agreement = await prisma.agreement.findUnique({
      where: { id: params.id },
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

    return NextResponse.json(agreement);
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
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // Update the agreement with the provided data
    const updatedAgreement = await prisma.agreement.update({
      where: { id: params.id },
      data: {
        ...data,
      },
    });

    return NextResponse.json(updatedAgreement);
  } catch (error) {
    console.error('Error updating agreement:', error);
    return NextResponse.json(
      { error: 'Failed to update agreement' },
      { status: 500 }
    );
  }
} 