import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// API endpoint to get invitation details
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const invitation = await prisma.familyInvitation.findUnique({
      where: { invitationToken: token },
      include: {
        inviter: {
          select: { fullName: true }
        }
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Return invitation details without sensitive information
    return NextResponse.json({
      inviterName: invitation.inviter.fullName,
      inviteeFullName: invitation.inviteeFullName,
      relationship: invitation.relationship,
      status: invitation.status,
      expiresAt: invitation.expiresAt
    });
  } catch (error) {
    console.error('Error getting invitation details:', error);
    return NextResponse.json({ error: 'Failed to get invitation details' }, { status: 500 });
  }
}

// API endpoint to cancel an invitation
export async function DELETE(request: Request) {
  try {
    // Get the user ID from cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    // Find the invitation
    const invitation = await prisma.familyInvitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if the user is the inviter
    if (invitation.inviterId !== userId) {
      return NextResponse.json({ error: 'You are not authorized to cancel this invitation' }, { status: 403 });
    }

    // Delete the invitation
    await prisma.familyInvitation.delete({
      where: { id: invitationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }
} 