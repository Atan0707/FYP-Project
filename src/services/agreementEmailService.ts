import { prisma } from '@/lib/prisma';

interface AgreementParticipant {
  email: string;
  fullName: string;
  relationship?: string;
}

interface AgreementEmailData {
  assetName: string;
  assetType: string;
  distributionType: string;
  adminUsername: string;
  adminNotes?: string;
  adminSignedAt: Date;
}

export async function sendAgreementCompletionEmails(agreementId: string) {
  try {
    // Get agreement details with all related data
    const agreement = await prisma.agreement.findFirst({
      where: { id: agreementId },
      include: {
        distribution: {
          include: {
            asset: {
              include: {
                user: true, // Asset owner
              },
            },
          },
        },
        signatures: {
          include: {
            signedBy: true, // Family members who signed
          },
        },
      },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Get admin details
    const admin = await prisma.admin.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    // Collect all participants
    const participants: AgreementParticipant[] = [];
    
    // Add asset owner
    const owner = agreement.distribution.asset.user;
    participants.push({
      email: owner.email,
      fullName: owner.fullName,
      relationship: 'Owner',
    });

    // Add family members who signed
    agreement.signatures.forEach(signature => {
      const signedBy = signature.signedBy;
      if (!participants.some(p => p.email === signedBy.email)) {
        participants.push({
          email: signedBy.email,
          fullName: signedBy.fullName,
          relationship: 'Family Member',
        });
      }
    });

    // Add beneficiaries from distribution
    if (agreement.distribution.beneficiaries) {
      const beneficiaries = agreement.distribution.beneficiaries as any[];
      
      for (const beneficiary of beneficiaries) {
        if (beneficiary.email && beneficiary.fullName) {
          if (!participants.some(p => p.email === beneficiary.email)) {
            participants.push({
              email: beneficiary.email,
              fullName: beneficiary.fullName,
              relationship: 'Beneficiary',
            });
          }
        }
      }
    }

    // Prepare email data
    const emailData: AgreementEmailData = {
      assetName: agreement.distribution.asset.name,
      assetType: agreement.distribution.asset.type,
      distributionType: agreement.distribution.type,
      adminUsername: admin.username,
      adminNotes: agreement.adminNotes || undefined,
      adminSignedAt: agreement.adminSignedAt!,
    };

    // Send emails to all participants
    const emailPromises = participants.map(participant => 
      sendAgreementCompletionEmail(participant, emailData)
    );

    await Promise.allSettled(emailPromises);

    return { success: true, emailsSent: participants.length };
  } catch (error) {
    console.error('Error sending agreement completion emails:', error);
    throw error;
  }
}

async function sendAgreementCompletionEmail(
  participant: AgreementParticipant,
  emailData: AgreementEmailData
) {
  const subject = `Agreement Completed: ${emailData.assetName} Distribution`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #28a745; margin: 0 0 10px 0;">Agreement Completed</h2>
        <p style="color: #6c757d; margin: 0;">The asset distribution agreement has been finalized by the administrator.</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
        <h3 style="color: #495057; margin-top: 0;">Agreement Details</h3>
        
        <div style="margin-bottom: 15px;">
          <strong>Asset:</strong> ${emailData.assetName}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>Asset Type:</strong> ${emailData.assetType}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>Distribution Type:</strong> ${emailData.distributionType.toUpperCase()}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>Your Role:</strong> ${participant.relationship}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>Signed by Administrator:</strong> ${emailData.adminUsername}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>Completion Date:</strong> ${emailData.adminSignedAt.toLocaleString()}
        </div>
        
        ${emailData.adminNotes ? `
          <div style="margin-bottom: 15px;">
            <strong>Administrator Notes:</strong>
            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 5px;">
              ${emailData.adminNotes}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <h4 style="color: #495057; margin-bottom: 10px;">What happens next?</h4>
          <p style="color: #6c757d; margin-bottom: 10px;">
            The agreement has been completed and recorded on the blockchain. All parties have been notified.
          </p>
          <p style="color: #6c757d; margin: 0;">
            You can access your dashboard to view the complete agreement details and transaction history.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
        <p style="color: #6c757d; font-size: 14px; margin: 0;">
          This is an automated notification from the Asset Distribution System.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Agreement Completed: ${emailData.assetName} Distribution

Dear ${participant.fullName},

The asset distribution agreement has been finalized by the administrator.

Agreement Details:
- Asset: ${emailData.assetName}
- Asset Type: ${emailData.assetType}
- Distribution Type: ${emailData.distributionType.toUpperCase()}
- Your Role: ${participant.relationship}
- Signed by Administrator: ${emailData.adminUsername}
- Completion Date: ${emailData.adminSignedAt.toLocaleString()}

${emailData.adminNotes ? `Administrator Notes: ${emailData.adminNotes}` : ''}

What happens next?
The agreement has been completed and recorded on the blockchain. All parties have been notified.
You can access your dashboard to view the complete agreement details and transaction history.

This is an automated notification from the Asset Distribution System.
  `;

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: participant.email,
        subject,
        text: textContent,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email to ${participant.email}`);
    }

    console.log(`Agreement completion email sent to ${participant.email}`);
  } catch (error) {
    console.error(`Error sending email to ${participant.email}:`, error);
    throw error;
  }
}