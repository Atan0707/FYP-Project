import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    
    if (!userId) {
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
        userId: targetUserId || userId, // If not registered, use current user's ID
        addedById: userId,
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