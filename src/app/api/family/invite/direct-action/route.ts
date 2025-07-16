import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getInverseRelationship } from '@/lib/relationships';
import { encrypt, decrypt } from '@/services/encryption';

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

    // Decrypt the invitation IC for verification
    let invitationIC = invitation.inviteeIC;
    try {
      invitationIC = decrypt(invitation.inviteeIC);
    } catch (error) {
      console.error('Error decrypting invitation IC:', error);
      // If decryption fails, assume it's already unencrypted (for backward compatibility)
    }

    // Verify that the IC matches the invitation
    if (ic && ic !== invitationIC) {
      return NextResponse.json({ error: 'IC number does not match the invitation' }, { status: 400 });
    }

    // Find the invitee user if registered by decrypting stored IC numbers
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, ic: true, phone: true }
    });

    let inviteeUser = null;
    for (const user of users) {
      try {
        const decryptedIC = decrypt(user.ic);
        if (decryptedIC === invitationIC) {
          inviteeUser = {
            id: user.id,
            fullName: decrypt(user.fullName),
            ic: decryptedIC,
            phone: decrypt(user.phone),
            encryptedFullName: user.fullName,
            encryptedIC: user.ic,
            encryptedPhone: user.phone,
          };
          break;
        }
      } catch (error) {
        console.error('Error decrypting user data:', error);
        // Try direct comparison for backward compatibility
        if (user.ic === invitationIC) {
          inviteeUser = {
            id: user.id,
            fullName: user.fullName,
            ic: user.ic,
            phone: user.phone,
            encryptedFullName: encrypt(user.fullName),
            encryptedIC: encrypt(user.ic),
            encryptedPhone: encrypt(user.phone),
          };
          break;
        }
      }
    }

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
      // Decrypt inviter data for family relationship creation
      let inviterFullName = invitation.inviter.fullName;
      let inviterIC = invitation.inviter.ic || "";
      let inviterPhone = invitation.inviter.phone || "";

      try {
        inviterFullName = decrypt(invitation.inviter.fullName);
      } catch (error) {
        console.error('Error decrypting inviter fullName:', error);
        // Use as-is if decryption fails
      }

      try {
        if (invitation.inviter.ic) {
          inviterIC = decrypt(invitation.inviter.ic);
        }
      } catch (error) {
        console.error('Error decrypting inviter IC:', error);
        // Use as-is if decryption fails
      }

      try {
        if (invitation.inviter.phone) {
          inviterPhone = decrypt(invitation.inviter.phone);
        }
      } catch (error) {
        console.error('Error decrypting inviter phone:', error);
        // Use as-is if decryption fails
      }

      // Decrypt invitation data
      let inviteeFullName = invitation.inviteeFullName;
      let inviteePhone = invitation.inviteePhone;

      try {
        inviteeFullName = decrypt(invitation.inviteeFullName);
      } catch (error) {
        console.error('Error decrypting invitee fullName:', error);
        // Use as-is if decryption fails
      }

      try {
        inviteePhone = decrypt(invitation.inviteePhone);
      } catch (error) {
        console.error('Error decrypting invitee phone:', error);
        // Use as-is if decryption fails
      }

      // Create relationship from inviter to invitee with encrypted data
      await prisma.family.create({
        data: {
          fullName: encrypt(inviteeFullName),
          ic: encrypt(invitationIC),
          relationship: invitation.relationship,
          phone: encrypt(inviteePhone),
          isRegistered: !!inviteeUser,
          userId: invitation.inviterId,
          relatedUserId: inviteeUser?.id || null,
          inverseRelationship: getInverseRelationship(invitation.relationship)
        }
      });

      // If invitee is registered, create inverse relationship with encrypted data
      if (inviteeUser) {
        await prisma.family.create({
          data: {
            fullName: encrypt(inviterFullName),
            ic: encrypt(inviterIC),
            relationship: getInverseRelationship(invitation.relationship),
            phone: encrypt(inviterPhone),
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