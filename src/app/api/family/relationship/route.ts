import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getInverseRelationship } from '@/lib/relationships';

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { id, relationship } = body;

    if (!id || !relationship) {
      return NextResponse.json(
        { error: 'Family member ID and relationship are required' },
        { status: 400 }
      );
    }

    // Get the existing family record
    const existingFamily = await prisma.family.findUnique({
      where: { id },
      include: { relatedToUser: true },
    });

    if (!existingFamily) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      );
    }

    // Check if the current user owns this family record or is the related user
    if (existingFamily.userId !== userId && existingFamily.relatedUserId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this family relationship' },
        { status: 403 }
      );
    }

    // Update the family member's relationship
    const updatedFamily = await prisma.family.update({
      where: { id },
      data: {
        relationship,
        inverseRelationship: existingFamily.relatedUserId ? getInverseRelationship(relationship) : null,
      },
    });

    // If there's a related user (bidirectional relationship), update their reciprocal relationship
    if (existingFamily.relatedUserId) {
      // Find the reciprocal relationship
      const reciprocalRelationship = await prisma.family.findFirst({
        where: {
          userId: existingFamily.relatedUserId,
          relatedUserId: existingFamily.userId,
        },
      });

      if (reciprocalRelationship) {
        // Update the reciprocal relationship
        await prisma.family.update({
          where: { id: reciprocalRelationship.id },
          data: {
            relationship: getInverseRelationship(relationship),
            inverseRelationship: relationship,
          },
        });
      }
    }

    // Also handle the case where the current user is the related user
    if (existingFamily.relatedUserId === userId) {
      // Find the main relationship record
      const mainRelationship = await prisma.family.findFirst({
        where: {
          userId: existingFamily.userId,
          relatedUserId: userId,
        },
      });

      if (mainRelationship) {
        // Update the main relationship record
        await prisma.family.update({
          where: { id: mainRelationship.id },
          data: {
            relationship: getInverseRelationship(relationship),
            inverseRelationship: relationship,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      family: updatedFamily,
      message: 'Family relationship updated successfully'
    });
  } catch (error) {
    console.error('Error updating family relationship:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 