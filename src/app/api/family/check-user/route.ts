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

    const { ic } = await req.json();

    if (!ic) {
      return NextResponse.json(
        { success: false, error: 'IC number is required' },
        { status: 400 }
      );
    }

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { ic },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    if (user) {
      // Don't allow adding yourself as a family member
      if (user.id === session.user.id) {
        return NextResponse.json(
          { success: false, error: 'Cannot add yourself as a family member' },
          { status: 400 }
        );
      }

      // Check if this user is already a family member
      const existingRelation = await prisma.familyMember.findFirst({
        where: {
          OR: [
            { userId: user.id, addedById: session.user.id },
            { userId: session.user.id, addedById: user.id },
          ],
        },
      });

      if (existingRelation) {
        return NextResponse.json(
          { success: false, error: 'This person is already in your family' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        isRegistered: true,
        user: {
          fullName: user.fullName,
          email: user.email,
        },
      });
    }

    return NextResponse.json({
      success: true,
      isRegistered: false,
    });
  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check user' },
      { status: 500 }
    );
  }
} 