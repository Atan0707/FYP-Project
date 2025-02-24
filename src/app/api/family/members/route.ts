import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all family members where the current user is either the user or the adder
    const familyMembers = await prisma.familyMember.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { addedById: session.user.id },
        ],
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        addedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Transform the data to match the expected format
    const transformedMembers = familyMembers.map(member => ({
      id: member.id,
      fullName: member.isRegistered ? member.user.fullName : 'Pending Registration',
      email: member.isRegistered ? member.user.email : null,
      relationship: member.relationship,
      isRegistered: member.isRegistered,
      pendingIc: member.pendingIc,
    }));

    return NextResponse.json({
      success: true,
      members: transformedMembers,
    });
  } catch (error) {
    console.error('Error fetching family members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch family members' },
      { status: 500 }
    );
  }
} 