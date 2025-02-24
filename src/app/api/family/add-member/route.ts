import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { ic, relationship, isRegistered } = await req.json();

    if (!ic || !relationship) {
      return NextResponse.json(
        { success: false, error: 'IC number and relationship are required' },
        { status: 400 }
      );
    }

    // If the user is registered, get their ID
    let targetUserId = null;
    if (isRegistered) {
      const targetUser = await prisma.user.findUnique({
        where: { ic },
        select: { id: true },
      });
      
      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      
      targetUserId = targetUser.id;
    }

    // Create the family member record
    const familyMember = await prisma.familyMember.create({
      data: {
        userId: targetUserId || session.user.id, // If not registered, use current user's ID
        addedById: session.user.id,
        relationship,
        isRegistered,
        pendingIc: isRegistered ? null : ic,
      },
    });

    return NextResponse.json({
      success: true,
      familyMember,
    });
  } catch (error) {
    console.error('Error adding family member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add family member' },
      { status: 500 }
    );
  }
} 