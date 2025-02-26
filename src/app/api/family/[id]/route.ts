import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Access the id directly from params
    const { id } = params;

    // Check if the family member exists and belongs to the current user
    const familyMember = await prisma.family.findFirst({
      where: { 
        id,
        userId 
      },
      include: { relatedToUser: true },
    });

    if (!familyMember) {
      return new NextResponse('Family member not found', { status: 404 });
    }

    // Delete the family member
    const family = await prisma.family.delete({
      where: {
        id,
      },
    });

    // If there's a related user, find and update their reciprocal relationship
    if (familyMember.relatedUserId) {
      // Find the reciprocal relationship
      const reciprocalRelationship = await prisma.family.findFirst({
        where: {
          userId: familyMember.relatedUserId,
          relatedUserId: userId,
        },
      });

      if (reciprocalRelationship) {
        // Update the reciprocal relationship to remove the bidirectional link
        await prisma.family.update({
          where: { id: reciprocalRelationship.id },
          data: {
            relatedUserId: null,
            inverseRelationship: null,
          },
        });
      }
    }

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error deleting family:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 