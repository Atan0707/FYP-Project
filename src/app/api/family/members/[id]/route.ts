import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if the family member exists and belongs to the current user
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { addedById: session.user.id },
        ],
      },
    });

    if (!familyMember) {
      return NextResponse.json(
        { success: false, error: 'Family member not found' },
        { status: 404 }
      );
    }

    // Delete the family member
    await prisma.familyMember.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting family member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete family member' },
      { status: 500 }
    );
  }
} 