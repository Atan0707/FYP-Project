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

interface Beneficiary {
  email?: string;
  fullName?: string;
  familyId?: string;
  percentage?: number;
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
      const beneficiaries = agreement.distribution.beneficiaries as Beneficiary[];
      
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
      adminUsername: 'Admin',
      adminNotes: agreement.adminNotes || undefined,
      adminSignedAt: agreement.adminSignedAt!,
    };

        // Send combined completion and PDF emails to all participants
    const emailPromises = participants.map(participant => 
      sendCombinedCompletionAndPDFEmail(participant, emailData, agreement.distribution.id)
    );

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Count successful emails
    const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
    const failedEmails = emailResults.filter(result => result.status === 'rejected').length;

    return { success: true, emailsSent: successfulEmails, emailsFailed: failedEmails };
  } catch (error) {
    console.error('Error sending agreement completion emails:', error);
    throw error;
  }
}

// async function sendAdminConfirmationEmail(
//   admin: Admin,
//   emailData: AgreementEmailData,
//   participants: AgreementParticipant[],
//   successfulEmails: number,
//   failedEmails: number
// ) {
//   const subject = `Agreement Completion Confirmation: ${emailData.assetName}`;
  
//   const htmlContent = `
//     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
//       <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
//         <h2 style="color: #155724; margin: 0 0 10px 0;">Agreement Completion Confirmation</h2>
//         <p style="color: #155724; margin: 0;">You have successfully completed the agreement signing process.</p>
//       </div>
      
//       <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
//         <h3 style="color: #495057; margin-top: 0;">Agreement Details</h3>
        
//         <div style="margin-bottom: 15px;">
//           <strong>Asset:</strong> ${emailData.assetName}
//         </div>
        
//         <div style="margin-bottom: 15px;">
//           <strong>Asset Type:</strong> ${emailData.assetType}
//         </div>
        
//         <div style="margin-bottom: 15px;">
//           <strong>Distribution Type:</strong> ${emailData.distributionType.toUpperCase()}
//         </div>
        
//         <div style="margin-bottom: 15px;">
//           <strong>Completion Date:</strong> ${emailData.adminSignedAt.toLocaleString()}
//         </div>
        
//         <div style="margin-bottom: 15px;">
//           <strong>Signed by:</strong> ${emailData.adminUsername}
//         </div>
        
//         ${emailData.adminNotes ? `
//           <div style="margin-bottom: 15px;">
//             <strong>Your Notes:</strong>
//             <div style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 5px;">
//               ${emailData.adminNotes}
//             </div>
//           </div>
//         ` : ''}
        
//         <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
//           <h4 style="color: #495057; margin-bottom: 10px;">Notification Summary</h4>
//           <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px;">
//             <div style="margin-bottom: 10px;">
//               <strong>Total Participants:</strong> ${participants.length}
//             </div>
//             <div style="margin-bottom: 10px; color: #28a745;">
//               <strong>✓ Emails Sent Successfully:</strong> ${successfulEmails}
//             </div>
//             ${failedEmails > 0 ? `
//               <div style="margin-bottom: 10px; color: #dc3545;">
//                 <strong>✗ Failed to Send:</strong> ${failedEmails}
//               </div>
//             ` : ''}
//           </div>
//         </div>
        
//         <div style="margin-top: 20px;">
//           <h4 style="color: #495057; margin-bottom: 10px;">Participants Notified:</h4>
//           <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px;">
//             ${participants.map(participant => `
//               <div style="margin-bottom: 8px; padding: 8px; background-color: #ffffff; border-radius: 4px; border-left: 3px solid #007bff;">
//                 <strong>${participant.fullName}</strong> (${participant.relationship})<br>
//                 <span style="color: #6c757d; font-size: 14px;">${participant.email}</span>
//               </div>
//             `).join('')}
//           </div>
//         </div>
        
//         <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
//           <h4 style="color: #495057; margin-bottom: 10px;">Next Steps</h4>
//           <p style="color: #6c757d; margin-bottom: 10px;">
//             The agreement has been successfully completed and recorded on the blockchain. All participants have been notified of the completion.
//           </p>
//           <p style="color: #6c757d; margin: 0;">
//             You can view the complete agreement details and transaction history in the admin dashboard.
//           </p>
//         </div>
//       </div>
      
//       <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
//         <p style="color: #6c757d; font-size: 14px; margin: 0;">
//           This is an automated confirmation from the Asset Distribution System.
//         </p>
//       </div>
//     </div>
//   `;

//   const textContent = `
// Agreement Completion Confirmation: ${emailData.assetName}

// Dear ${admin.username},

// You have successfully completed the agreement signing process.

// Agreement Details:
// - Asset: ${emailData.assetName}
// - Asset Type: ${emailData.assetType}
// - Distribution Type: ${emailData.distributionType.toUpperCase()}
// - Completion Date: ${emailData.adminSignedAt.toLocaleString()}
// - Signed by: ${emailData.adminUsername}

// ${emailData.adminNotes ? `Your Notes: ${emailData.adminNotes}` : ''}

// Notification Summary:
// - Total Participants: ${participants.length}
// - Emails Sent Successfully: ${successfulEmails}
// ${failedEmails > 0 ? `- Failed to Send: ${failedEmails}` : ''}

// Participants Notified:
// ${participants.map(participant => `- ${participant.fullName} (${participant.relationship}) - ${participant.email}`).join('\n')}

// Next Steps:
// The agreement has been successfully completed and recorded on the blockchain. All participants have been notified of the completion.
// You can view the complete agreement details and transaction history in the admin dashboard.

// This is an automated confirmation from the Asset Distribution System.
//   `;

//   try {
//     const response = await fetch(`${process.env.NEXTAUTH_URL || 'https://wemsp.hrzhkm.xyz'}/api/send-email`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         to: process.env.ADMIN_EMAIL || 'admin@wemsp.my', // Use environment variable for admin email
//         subject,
//         text: textContent,
//         html: htmlContent,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to send admin confirmation email`);
//     }

//     console.log(`Admin confirmation email sent successfully`);
//   } catch (error) {
//     console.error(`Error sending admin confirmation email:`, error);
//     throw error;
//   }
// }

async function sendCombinedCompletionAndPDFEmail(
  participant: AgreementParticipant,
  emailData: AgreementEmailData,
  distributionId: string
) {
  const subject = `Agreement Completed: ${emailData.assetName} Distribution`;
  
  // Generate PDF link
  const pdfUrl = `${process.env.NEXTAUTH_URL || 'https://wemsp.hrzhkm.xyz'}/api/agreement-pdf/${distributionId}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #28a745; margin: 0 0 10px 0;">Agreement Completed</h2>
        <p style="color: #6c757d; margin: 0;">The asset distribution agreement has been completed and your document is ready.</p>
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
          <strong>Your Relationship:</strong> ${participant.relationship}
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
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #155724; margin: 0 0 10px 0;">📄 View Your Agreement Here</h4>
          <p style="color: #155724; margin: 0 0 15px 0;">
            The official agreement document has been completed and is ready for your records.
          </p>
          <div style="text-align: center;">
            <a href="${pdfUrl}" 
               style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              📄 View Agreement Document
            </a>
          </div>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <h4 style="color: #495057; margin-bottom: 10px;">What happens next?</h4>
          <p style="color: #6c757d; margin-bottom: 10px;">
            The agreement has been completed and recorded on the blockchain. All parties have been notified.
          </p>
          <p style="color: #6c757d; margin-bottom: 10px;">
            You can access your dashboard to view the complete agreement details and transaction history.
          </p>
          
          <h4 style="color: #495057; margin: 20px 0 10px 0;">Important Notes:</h4>
          <ul style="color: #6c757d; margin: 0; padding-left: 20px;">
            <li>This document is legally binding and has been recorded on the blockchain</li>
            <li>Please save this document for your records</li>
            <li>The document can be accessed anytime using the link above</li>
            <li>If you have any questions, please contact the administrator</li>
          </ul>
        </div>
      </div>
      
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            This is an automated notification from the Will Estate Management Service Provider (WEMSP).
          </p>
          <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
            Please do not reply to this email.
          </p>
        </div>
    </div>
  `;

  const textContent = `
Agreement Completed: ${emailData.assetName} Distribution

Dear ${participant.fullName},

The asset distribution agreement has been completed and your document is ready.

Agreement Details:
- Asset: ${emailData.assetName}
- Asset Type: ${emailData.assetType}
- Distribution Type: ${emailData.distributionType.toUpperCase()}
- Your Relationship: ${participant.relationship}
- Completion Date: ${emailData.adminSignedAt.toLocaleString()}

${emailData.adminNotes ? `Administrator Notes: ${emailData.adminNotes}` : ''}

📄 View Your Agreement Here: ${pdfUrl}

What happens next?
The agreement has been completed and recorded on the blockchain. All parties have been notified.
You can access your dashboard to view the complete agreement details and transaction history.

Important Notes:
- This document is legally binding and has been recorded on the blockchain
- Please save this document for your records
- The document can be accessed anytime using the link above
- If you have any questions, please contact the administrator

This is an automated notification from the Will Estate Management Service Provider (WEMSP).
Please do not reply to this email.
  `;

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'https://wemsp.hrzhkm.xyz'}/api/send-email`, {
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

    console.log(`Combined agreement completion and PDF email sent to ${participant.email}`);
  } catch (error) {
    console.error(`Error sending email to ${participant.email}:`, error);
    throw error;
  }
}

export async function sendAgreementSigningNotification(
  agreementId: string,
  signerName: string,
  signerRelationship: string
) {
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

    // Collect all participants except the one who just signed
    const participants: AgreementParticipant[] = [];
    
    // Add asset owner if they haven't signed yet
    const owner = agreement.distribution.asset.user;
    const ownerSignature = agreement.signatures.find(sig => sig.signedById === owner.id);
    if (!ownerSignature || ownerSignature.status !== 'signed') {
      participants.push({
        email: owner.email,
        fullName: owner.fullName,
        relationship: 'Owner',
      });
    }

    // Add other family members who haven't signed yet
    agreement.signatures.forEach(signature => {
      const signedBy = signature.signedBy;
      if (signature.status !== 'signed' && signedBy.fullName !== signerName) {
        if (!participants.some(p => p.email === signedBy.email)) {
          participants.push({
            email: signedBy.email,
            fullName: signedBy.fullName,
            relationship: 'Family Member',
          });
        }
      }
    });

    // Add beneficiaries from distribution who haven't signed
    if (agreement.distribution.beneficiaries) {
      const beneficiaries = agreement.distribution.beneficiaries as Beneficiary[];
      
      for (const beneficiary of beneficiaries) {
        if (beneficiary.email && beneficiary.fullName) {
          const beneficiarySignature = agreement.signatures.find(sig => sig.signedBy.email === beneficiary.email);
          if (!beneficiarySignature || beneficiarySignature.status !== 'signed') {
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
    }

    // Send notification emails to all remaining participants
    const emailPromises = participants.map(participant => 
      sendAgreementSigningNotificationEmail(
        participant,
        {
          assetName: agreement.distribution.asset.name,
          assetType: agreement.distribution.asset.type,
          distributionType: agreement.distribution.type,
          signerName,
          signerRelationship,
          totalSignatures: agreement.signatures.length,
          completedSignatures: agreement.signatures.filter(sig => sig.status === 'signed').length,
        }
      )
    );

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Count successful emails
    const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
    const failedEmails = emailResults.filter(result => result.status === 'rejected').length;

    return { success: true, emailsSent: successfulEmails, emailsFailed: failedEmails };
  } catch (error) {
    console.error('Error sending agreement signing notification emails:', error);
    throw error;
  }
}

async function sendAgreementSigningNotificationEmail(
  participant: AgreementParticipant,
  emailData: {
    assetName: string;
    assetType: string;
    distributionType: string;
    signerName: string;
    signerRelationship: string;
    totalSignatures: number;
    completedSignatures: number;
  }
) {
  const subject = `Agreement Update: ${emailData.signerName} has signed - ${emailData.assetName}`;
  
  const remainingSignatures = emailData.totalSignatures - emailData.completedSignatures;
  const progressPercentage = Math.round((emailData.completedSignatures / emailData.totalSignatures) * 100);
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #155724; margin: 0 0 10px 0;">Agreement Signing Update</h2>
        <p style="color: #155724; margin: 0;">A family member has signed the agreement for ${emailData.assetName}.</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
        <h3 style="color: #495057; margin-top: 0;">Hello ${participant.fullName},</h3>
        
        <p style="color: #6c757d; margin-bottom: 20px;">
          We wanted to inform you that <strong>${emailData.signerName}</strong> (${emailData.signerRelationship}) has signed the agreement for the asset distribution.
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #495057; margin: 0 0 15px 0;">📋 Agreement Details</h4>
          <div style="margin-bottom: 10px;">
            <strong>Asset:</strong> ${emailData.assetName}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Asset Type:</strong> ${emailData.assetType}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Distribution Type:</strong> ${emailData.distributionType.toUpperCase()}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Recently Signed By:</strong> ${emailData.signerName} (${emailData.signerRelationship})
          </div>
          <div style="color: #6c757d; font-size: 14px;">
            <strong>Your Role:</strong> ${participant.relationship}
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #495057; margin: 0 0 15px 0;">📊 Signing Progress</h4>
          <div style="margin-bottom: 15px;">
            <div style="background-color: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden;">
              <div style="background-color: #28a745; height: 100%; width: ${progressPercentage}%; border-radius: 10px; transition: width 0.3s ease;"></div>
            </div>
            <div style="text-align: center; margin-top: 8px; font-size: 14px; color: #6c757d;">
              ${emailData.completedSignatures} of ${emailData.totalSignatures} signatures completed (${progressPercentage}%)
            </div>
          </div>
          ${remainingSignatures > 0 ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>⏳ ${remainingSignatures} signature${remainingSignatures > 1 ? 's' : ''} still needed</strong> before the agreement can be finalized by the administrator.
              </p>
            </div>
          ` : `
            <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745;">
              <p style="color: #155724; margin: 0; font-size: 14px;">
                <strong>✅ All signatures completed!</strong> The agreement is now ready for administrator approval.
              </p>
            </div>
          `}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL || 'https://wemsp.hrzhkm.xyz'}/pages/agreements" 
             style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            📝 View Agreement Details
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <h4 style="color: #495057; margin-bottom: 10px;">What happens next?</h4>
          ${remainingSignatures > 0 ? `
            <p style="color: #6c757d; margin-bottom: 10px;">
              The agreement is waiting for ${remainingSignatures} more signature${remainingSignatures > 1 ? 's' : ''} from other family members.
            </p>
            <p style="color: #6c757d; margin-bottom: 10px;">
              Once all family members have signed, the agreement will be sent to the administrator for final approval.
            </p>
          ` : `
            <p style="color: #6c757d; margin-bottom: 10px;">
              All family members have now signed the agreement. It will be sent to the administrator for final approval.
            </p>
            <p style="color: #6c757d; margin-bottom: 10px;">
              You will receive another notification once the administrator has completed the agreement.
            </p>
          `}
          <p style="color: #6c757d; margin: 0;">
            You can track the progress and view all details in your dashboard.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h4 style="color: #495057; margin: 0 0 10px 0;">💡 Need to Sign?</h4>
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            If you haven't signed this agreement yet, please visit your dashboard to review and sign the agreement.
            Your signature is important for the completion of this asset distribution.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
        <p style="color: #6c757d; font-size: 14px; margin: 0;">
          This is an automated notification from the Will Estate Management Service Provider (WEMSP).
        </p>
        <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
          Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Agreement Signing Update - ${emailData.assetName}

Hello ${participant.fullName},

We wanted to inform you that ${emailData.signerName} (${emailData.signerRelationship}) has signed the agreement for the asset distribution.

Agreement Details:
- Asset: ${emailData.assetName}
- Asset Type: ${emailData.assetType}
- Distribution Type: ${emailData.distributionType.toUpperCase()}
- Recently Signed By: ${emailData.signerName} (${emailData.signerRelationship})
- Your Role: ${participant.relationship}

Signing Progress:
${emailData.completedSignatures} of ${emailData.totalSignatures} signatures completed (${progressPercentage}%)

${remainingSignatures > 0 ? 
  `⏳ ${remainingSignatures} signature${remainingSignatures > 1 ? 's' : ''} still needed before the agreement can be finalized by the administrator.` :
  `✅ All signatures completed! The agreement is now ready for administrator approval.`
}

View Agreement Details: ${process.env.NEXTAUTH_URL || 'https://wemsp.hrzhkm.xyz'}/pages/agreements

What happens next?
${remainingSignatures > 0 ? 
  `The agreement is waiting for ${remainingSignatures} more signature${remainingSignatures > 1 ? 's' : ''} from other family members. Once all family members have signed, the agreement will be sent to the administrator for final approval.` :
  `All family members have now signed the agreement. It will be sent to the administrator for final approval. You will receive another notification once the administrator has completed the agreement.`
}

You can track the progress and view all details in your dashboard.

Need to Sign?
If you haven't signed this agreement yet, please visit your dashboard to review and sign the agreement. Your signature is important for the completion of this asset distribution.

This is an automated notification from the Will Estate Management Service Provider (WEMSP).
Please do not reply to this email.
  `;

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'https://wemsp.hrzhkm.xyz'}/api/send-email`, {
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

    console.log(`Agreement signing notification email sent to ${participant.email}`);
  } catch (error) {
    console.error(`Error sending email to ${participant.email}:`, error);
    throw error;
  }
}

