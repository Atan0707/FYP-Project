import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { getInverseRelationship } from '@/lib/relationships';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper function to generate a random token
function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to send invitation email
async function sendInvitationEmail(
  email: string,
  fullName: string,
  inviterName: string,
  relationship: string,
  invitationToken: string
) {
  try {
    // Get base URL from environment or default to localhost
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/pages/family/accept-invitation?token=${invitationToken}`;
    
    // Direct action links (no login required)
    const directAcceptLink = `${baseUrl}/pages/family/direct-accept?token=${invitationToken}&action=accept`;
    // const directRejectLink = `${baseUrl}/pages/family/direct-accept?token=${invitationToken}&action=reject`;
    
    // Log for debugging
    console.log(`Sending invitation email to ${email} with link ${inviteLink}`);
    
    const response = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Family Relationship Invitation - Islamic Inheritance System',
        text: `Dear ${fullName},

${inviterName} has invited you to join their family network on the Islamic Inheritance System as their ${relationship}.

Please click on the link below to accept this invitation:

${directAcceptLink}

Alternatively, you can visit our website to respond to the invitation:
${inviteLink}

This invitation will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.

Best regards,
Islamic Inheritance System Team`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
    .button { display: inline-block; padding: 10px 20px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; }
    .accept { background-color: #4CAF50; color: white !important; }
    .reject { background-color: #f44336; color: white !important; }
    .alternative { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
    .footer { margin-top: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Family Invitation</h2>
    </div>
    <div class="content">
      <p>Dear ${fullName},</p>
      <p><strong>${inviterName}</strong> has invited you to join their family network on the Islamic Inheritance System as their <strong>${relationship}</strong>.</p>
      
      <p>Please click the button below to accept this invitation:</p>
      
      <div style="text-align: center;">
        <a href="${directAcceptLink}" class="button accept">Accept Invitation</a>
      </div>
      
      <div class="alternative">
        <p>Alternatively, you can visit our website to respond to the invitation:</p>
        <p><a href="${inviteLink}">Respond on our website</a></p>
      </div>
      
      <p>This invitation will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>Islamic Inheritance System Team</p>
    </div>
  </div>
</body>
</html>
`
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Email API error:', errorData);
      throw new Error(`Failed to send email: ${errorData?.message || response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('Email sending response:', responseData);
    
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Get the user ID from cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, ic, email, phone, relationship } = body;

    if (!fullName || !ic || !relationship || !phone) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    // Get the current user's details
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, ic: true, phone: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the invited user is already registered
    const invitedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email && !email.includes('@placeholder.com') ? email : undefined },
          { ic }
        ]
      },
      select: { id: true, fullName: true, email: true }
    });

    // Generate invitation token
    const invitationToken = generateInvitationToken();
    
    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the invitation
    const invitation = await prisma.familyInvitation.create({
      data: {
        relationship,
        invitationToken,
        inviterId: userId,
        inviteeId: invitedUser?.id || null,
        inviteeEmail: invitedUser?.email || email || `${ic}@placeholder.com`,
        inviteeIC: ic,
        inviteeFullName: fullName,
        inviteePhone: phone,
        expiresAt,
      }
    });

    // If email is provided or user is registered with an email, send invitation email
    const emailToUse = invitedUser?.email || (email && !email.includes('@placeholder.com') ? email : null);
    
    if (emailToUse) {
      console.log(`Attempting to send email to ${emailToUse}`);
      const emailSent = await sendInvitationEmail(
        emailToUse,
        invitedUser?.fullName || fullName,
        currentUser.fullName,
        relationship,
        invitationToken
      );

      if (!emailSent) {
        // If email fails, still create the invitation but notify the user
        return NextResponse.json({
          success: true,
          invitation,
          warning: 'Invitation created but email could not be sent'
        });
      }
      
      return NextResponse.json({
        success: true,
        invitation,
        message: 'Invitation sent successfully via email'
      });
    } else {
      // If no valid email, still create the invitation but notify the user
      return NextResponse.json({
        success: true,
        invitation,
        message: 'Invitation created successfully. No email was sent as no valid email was provided.'
      });
    }
  } catch (error) {
    console.error('Error creating family invitation:', error);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}

// API endpoint to handle invitation responses (accept/reject)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { token, action } = body;

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

    // Get the user ID from cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the invitation status
    const updatedInvitation = await prisma.familyInvitation.update({
      where: { id: invitation.id },
      data: {
        status: action === 'accept' ? 'accepted' : 'rejected',
        inviteeId: userId
      }
    });

    // If accepted, create the family relationship
    if (action === 'accept') {
      // Get current user details
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, ic: true, phone: true }
      });

      if (!currentUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Create relationship from inviter to invitee
      await prisma.family.create({
        data: {
          fullName: currentUser.fullName,
          ic: currentUser.ic || invitation.inviteeIC,
          relationship: invitation.relationship,
          phone: currentUser.phone || invitation.inviteePhone,
          isRegistered: true,
          userId: invitation.inviterId,
          relatedUserId: userId,
          inverseRelationship: getInverseRelationship(invitation.relationship)
        }
      });

      // Create inverse relationship from invitee to inviter
      await prisma.family.create({
        data: {
          fullName: invitation.inviter.fullName,
          ic: invitation.inviter.ic || "",
          relationship: getInverseRelationship(invitation.relationship),
          phone: invitation.inviter.phone || "",
          isRegistered: true,
          userId: userId,
          relatedUserId: invitation.inviterId,
          inverseRelationship: invitation.relationship
        }
      });
    }

    return NextResponse.json({
      success: true,
      invitation: updatedInvitation,
      message: action === 'accept' 
        ? 'Invitation accepted successfully' 
        : 'Invitation rejected successfully'
    });
  } catch (error) {
    console.error('Error processing invitation response:', error);
    return NextResponse.json({ error: 'Failed to process invitation' }, { status: 500 });
  }
} 