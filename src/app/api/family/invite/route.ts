import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { getInverseRelationship } from '@/lib/relationships';
import { encrypt, decrypt } from '@/services/encryption';
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
    const baseUrl = process.env.NEXTAUTH_URL || 'https://wemsp.hrzhkm.xyz';
    const inviteLink = `${baseUrl}/accept-invitation?token=${invitationToken}`;
    
    // Direct action links (no login required)
    const directAcceptLink = `${baseUrl}/accept-invitation/direct-accept?token=${invitationToken}&action=accept`;
    
    // Log for debugging
    console.log(`Sending invitation email to ${email} with link ${inviteLink}`);
    
    const subject = 'Family Relationship Invitation - WEMSP';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0 0 10px 0;">Family Invitation</h2>
          <p style="color: #155724; margin: 0;">You've been invited to join a family network on WEMSP.</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #495057; margin-top: 0;">Hello ${fullName},</h3>
          
          <p style="color: #6c757d; margin-bottom: 20px;">
            <strong>${inviterName}</strong> has invited you to join their family network on the Will Estate Management Service Provider (WEMSP) as their <strong>${relationship}</strong>.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #495057; margin: 0 0 15px 0;">📋 Invitation Details</h4>
            <div style="margin-bottom: 10px;">
              <strong>Invited by:</strong> ${inviterName}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Relationship:</strong> ${relationship}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Platform:</strong> Will Estate Management Service Provider (WEMSP)
            </div>
            <div style="color: #6c757d; font-size: 14px;">
              <strong>Expires:</strong> This invitation will expire in 7 days
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${directAcceptLink}" 
               style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              ✅ Accept Invitation
            </a>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h4 style="color: #495057; margin: 0 0 10px 0;">🔗 Alternative Access</h4>
            <p style="color: #6c757d; margin: 0 0 10px 0; font-size: 14px;">
              You can also respond to this invitation by visiting our website:
            </p>
            <p style="margin: 0;">
              <a href="${inviteLink}" style="color: #007bff; text-decoration: none; font-weight: bold;">
                ${inviteLink}
              </a>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <h4 style="color: #495057; margin-bottom: 10px;">What happens next?</h4>
            <ol style="color: #6c757d; margin: 0; padding-left: 20px;">
              <li>Click the "Accept Invitation" button above</li>
              <li>You'll be redirected to confirm your acceptance</li>
              <li>Your family relationship will be established in the system</li>
              <li>You'll gain access to family-related features and notifications</li>
            </ol>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Important Notes</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px;">
              <li>This invitation will expire in 7 days from now</li>
              <li>If you did not expect this invitation, you can safely ignore this email</li>
              <li>Only accept invitations from people you know and trust</li>
              <li>This will establish a family relationship in our estate management system</li>
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <h4 style="color: #495057; margin-bottom: 10px;">About WEMSP</h4>
            <p style="color: #6c757d; margin-bottom: 10px;">
              The Will Estate Management Service Provider (WEMSP) helps families manage their estate planning and inheritance according to Islamic principles.
            </p>
            <p style="color: #6c757d; margin: 0;">
              By accepting this invitation, you'll be part of a secure family network for estate management purposes.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            This is an automated invitation from the Will Estate Management Service Provider (WEMSP).
          </p>
          <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const textContent = `
Family Invitation - WEMSP

Hello ${fullName},

${inviterName} has invited you to join their family network on the Will Estate Management Service Provider (WEMSP) as their ${relationship}.

Invitation Details:
- Invited by: ${inviterName}
- Relationship: ${relationship}
- Platform: Will Estate Management Service Provider (WEMSP)
- Expires: This invitation will expire in 7 days

To accept this invitation, click the link below:
${directAcceptLink}

Alternative Access:
You can also respond to this invitation by visiting our website:
${inviteLink}

What happens next?
1. Click the "Accept Invitation" button above
2. You'll be redirected to confirm your acceptance
3. Your family relationship will be established in the system
4. You'll gain access to family-related features and notifications

Important Notes:
- This invitation will expire in 7 days from now
- If you did not expect this invitation, you can safely ignore this email
- Only accept invitations from people you know and trust
- This will establish a family relationship in our estate management system

About WEMSP:
The Will Estate Management Service Provider (WEMSP) helps families manage their estate planning and inheritance according to Islamic principles.
By accepting this invitation, you'll be part of a secure family network for estate management purposes.

This is an automated invitation from the Will Estate Management Service Provider (WEMSP).
Please do not reply to this email.
    `;
    
    const response = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send invitation email: ${response.status}`);
    }

    console.log(`Invitation email sent successfully to ${email}`);
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

    // Get the current user's details and decrypt them
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, ic: true, phone: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Decrypt current user's data
    let currentUserFullName = currentUser.fullName;

    try {
      currentUserFullName = decrypt(currentUser.fullName);
    } catch (error) {
      console.error('Error decrypting current user fullName:', error);
    }

    // Check if the invited user is already registered by decrypting stored data
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true, ic: true }
    });

    let invitedUser = null;
    for (const user of users) {
      try {
        const decryptedEmail = decrypt(user.email);
        const decryptedIC = decrypt(user.ic);
        
        // Check if email matches (if provided and not placeholder)
        if (email && !email.includes('@placeholder.com') && decryptedEmail === email) {
          invitedUser = {
            id: user.id,
            fullName: decrypt(user.fullName),
            email: decryptedEmail
          };
          break;
        }
        
        // Check if IC matches
        if (decryptedIC === ic) {
          invitedUser = {
            id: user.id,
            fullName: decrypt(user.fullName),
            email: decryptedEmail
          };
          break;
        }
      } catch (error) {
        console.error('Error decrypting user data during search:', error);
        // Try direct comparison for backward compatibility
        if ((email && !email.includes('@placeholder.com') && user.email === email) || user.ic === ic) {
          invitedUser = {
            id: user.id,
            fullName: user.fullName,
            email: user.email
          };
          break;
        }
      }
    }

    // Generate invitation token
    const invitationToken = generateInvitationToken();
    
    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the invitation with encrypted data
    const invitation = await prisma.familyInvitation.create({
      data: {
        relationship,
        invitationToken,
        inviterId: userId,
        inviteeId: invitedUser?.id || null,
        inviteeEmail: invitedUser?.email || email || `${ic}@placeholder.com`,
        inviteeIC: encrypt(ic),
        inviteeFullName: encrypt(fullName),
        inviteePhone: encrypt(phone),
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
        currentUserFullName,
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

      // Decrypt current user data
      let currentUserFullName = currentUser.fullName;
      let currentUserIC = currentUser.ic;
      let currentUserPhone = currentUser.phone;

      try {
        currentUserFullName = decrypt(currentUser.fullName);
      } catch (error) {
        console.error('Error decrypting current user fullName:', error);
      }

      try {
        currentUserIC = decrypt(currentUser.ic);
      } catch (error) {
        console.error('Error decrypting current user IC:', error);
      }

      try {
        currentUserPhone = decrypt(currentUser.phone);
      } catch (error) {
        console.error('Error decrypting current user phone:', error);
      }

      // Decrypt inviter data
      let inviterFullName = invitation.inviter.fullName;
      let inviterIC = invitation.inviter.ic || "";
      let inviterPhone = invitation.inviter.phone || "";

      try {
        inviterFullName = decrypt(invitation.inviter.fullName);
      } catch (error) {
        console.error('Error decrypting inviter fullName:', error);
      }

      try {
        if (invitation.inviter.ic) {
          inviterIC = decrypt(invitation.inviter.ic);
        }
      } catch (error) {
        console.error('Error decrypting inviter IC:', error);
      }

      try {
        if (invitation.inviter.phone) {
          inviterPhone = decrypt(invitation.inviter.phone);
        }
      } catch (error) {
        console.error('Error decrypting inviter phone:', error);
      }

      // Decrypt invitation data
      let inviteeIC = invitation.inviteeIC;
      let inviteePhone = invitation.inviteePhone;

      try {
        inviteeIC = decrypt(invitation.inviteeIC);
      } catch (error) {
        console.error('Error decrypting invitee IC:', error);
      }

      try {
        inviteePhone = decrypt(invitation.inviteePhone);
      } catch (error) {
        console.error('Error decrypting invitee phone:', error);
      }

      // Create relationship from inviter to invitee with encrypted data
      await prisma.family.create({
        data: {
          fullName: encrypt(currentUserFullName),
          ic: encrypt(currentUserIC || inviteeIC),
          relationship: invitation.relationship,
          phone: encrypt(currentUserPhone || inviteePhone),
          isRegistered: true,
          userId: invitation.inviterId,
          relatedUserId: userId,
          inverseRelationship: getInverseRelationship(invitation.relationship)
        }
      });

      // Create inverse relationship from invitee to inviter with encrypted data
      await prisma.family.create({
        data: {
          fullName: encrypt(inviterFullName),
          ic: encrypt(inviterIC),
          relationship: getInverseRelationship(invitation.relationship),
          phone: encrypt(inviterPhone),
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