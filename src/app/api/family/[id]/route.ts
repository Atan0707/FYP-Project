import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Access the id directly from params
    const id = (await params).id;

    // Check if the family member exists and belongs to the current user
    const familyMember = await prisma.family.findFirst({
      where: { 
        id,
        userId 
      },
      include: { relatedToUser: true },
    });

    // If not found, check if the current user is the related user
    if (!familyMember) {
      // Find the family member where the current user is the related user
      const relatedFamilyMember = await prisma.family.findFirst({
        where: {
          id,
          relatedUserId: userId
        },
        include: { user: true },
      });

      if (!relatedFamilyMember) {
        return new NextResponse('Family member not found', { status: 404 });
      }

      // Find the reciprocal relationship (where the current user is the main user)
      const reciprocalRelationship = await prisma.family.findFirst({
        where: {
          userId: userId,
          relatedUserId: relatedFamilyMember.userId,
        },
      });

      if (reciprocalRelationship) {
        // Delete the reciprocal relationship
        await prisma.family.delete({
          where: {
            id: reciprocalRelationship.id,
          },
        });
      }

      // Delete the related family member
      const family = await prisma.family.delete({
        where: {
          id: relatedFamilyMember.id,
        },
      });

      return NextResponse.json(family);
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
        // Delete the reciprocal relationship instead of just updating it
        await prisma.family.delete({
          where: { id: reciprocalRelationship.id },
        });
      }
    }

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error deleting family:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyMember = await prisma.family.findFirst({
      where: {
        id: id,
        userId: userId,
      },
      select: {
        id: true,
        fullName: true,
        relationship: true,
      },
    });

    if (!familyMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Decrypt family member name before returning
    let decryptedFullName = familyMember.fullName;
    try {
      decryptedFullName = decrypt(familyMember.fullName);
    } catch (error) {
      console.error('Error decrypting family member fullName:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    return NextResponse.json({
      ...familyMember,
      fullName: decryptedFullName
    });
  } catch (error) {
    console.error('Error fetching family member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 