import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getInverseRelationship } from '@/lib/relationships';

const prisma = new PrismaClient();

// API endpoint to handle direct invitation responses (accept/reject) without login
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, action, ic } = body;

    if (!token || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Find the invitation
    const invitation = await prisma.familyInvitation.findUnique({
      where: { invitationToken: token },
      include: {
        inviter: {
          select: { id: true, fullName: true, ic: true, phone: true }
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

    // Verify that the IC matches the invitation
    if (ic && ic !== invitation.inviteeIC) {
      return NextResponse.json({ error: 'IC number does not match the invitation' }, { status: 400 });
    }

    // Find the invitee user if registered
    const inviteeUser = await prisma.user.findFirst({
      where: { ic: invitation.inviteeIC },
      select: { id: true, fullName: true, ic: true, phone: true }
    });

    // Update the invitation status
    const updatedInvitation = await prisma.familyInvitation.update({
      where: { id: invitation.id },
      data: {
        status: action === 'accept' ? 'accepted' : 'rejected',
        inviteeId: inviteeUser?.id || null
      }
    });

    // If accepted, create the family relationship
    if (action === 'accept') {
      // Create relationship from inviter to invitee
      await prisma.family.create({
        data: {
          fullName: invitation.inviteeFullName,
          ic: invitation.inviteeIC,
          relationship: invitation.relationship,
          phone: invitation.inviteePhone,
          isRegistered: !!inviteeUser,
          userId: invitation.inviterId,
          relatedUserId: inviteeUser?.id || null,
          inverseRelationship: getInverseRelationship(invitation.relationship)
        }
      });

      // If invitee is registered, create inverse relationship
      if (inviteeUser) {
        await prisma.family.create({
          data: {
            fullName: invitation.inviter.fullName,
            ic: invitation.inviter.ic || "",
            relationship: getInverseRelationship(invitation.relationship),
            phone: invitation.inviter.phone || "",
            isRegistered: true,
            userId: inviteeUser.id,
            relatedUserId: invitation.inviterId,
            inverseRelationship: invitation.relationship
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      invitation: updatedInvitation,
      message: action === 'accept' 
        ? 'Invitation accepted successfully' 
        : 'Invitation rejected successfully'
    });
  } catch (error) {
    console.error('Error processing direct invitation response:', error);
    return NextResponse.json({ error: 'Failed to process invitation' }, { status: 500 });
  }
} 