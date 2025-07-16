import { prisma } from '@/lib/prisma';
import { decrypt } from '@/services/encryption';

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

// Helper function to decrypt user data safely
function decryptUserData(encryptedData: string): string {
  try {
    return decrypt(encryptedData);
  } catch (error) {
    console.error('Error decrypting user data:', error);
    // Return as-is if decryption fails (for backward compatibility)
    return encryptedData;
  }
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
    
    // Add asset owner with decrypted data
    const owner = agreement.distribution.asset.user;
    participants.push({
      email: decryptUserData(owner.email),
      fullName: decryptUserData(owner.fullName),
      relationship: 'Owner',
    });

    // Add family members who signed with decrypted data
    agreement.signatures.forEach(signature => {
      const signedBy = signature.signedBy;
      const decryptedEmail = decryptUserData(signedBy.email);
      if (!participants.some(p => p.email === decryptedEmail)) {
        participants.push({
          email: decryptedEmail,
          fullName: decryptUserData(signedBy.fullName),
          relationship: 'Family Member',
        });
      }
    });

    // Add beneficiaries from distribution
    if (agreement.distribution.beneficiaries) {
      const beneficiaries = agreement.distribution.beneficiaries as Beneficiary[];
      
      for (const beneficiary of beneficiaries) {
        if (beneficiary.email && beneficiary.fullName) {
          const decryptedEmail = decryptUserData(beneficiary.email);
          if (!participants.some(p => p.email === decryptedEmail)) {
            participants.push({
              email: decryptedEmail,
              fullName: decryptUserData(beneficiary.fullName),
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
//     const response = await fetch(process.env.NEXTAUTH_URL + '/api/send-email', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         to: admin.email,
//         subject,
//         text: textContent,
//         html: htmlContent,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error('Failed to send admin confirmation email');
//     }

//     console.log(`Admin confirmation email sent successfully to ${admin.email}`);
//   } catch (error) {
//     console.error('Error sending admin confirmation email:', error);
//     throw error;
//   }
// }

async function sendCombinedCompletionAndPDFEmail(
  participant: AgreementParticipant,
  emailData: AgreementEmailData,
  distributionId: string
) {
  const subject = `Agreement Completed: ${emailData.assetName} - Download Your Copy`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #155724; margin: 0 0 10px 0;">🎉 Agreement Successfully Completed!</h2>
        <p style="color: #155724; margin: 0;">The asset distribution agreement has been finalized and recorded on the blockchain.</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
        <h3 style="color: #495057; margin-top: 0;">Hello ${participant.fullName},</h3>
        
        <p style="color: #6c757d; margin-bottom: 20px;">
          Great news! The asset distribution agreement for <strong>${emailData.assetName}</strong> has been successfully completed and signed by all parties.
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #495057; margin: 0 0 15px 0;">📋 Agreement Summary</h4>
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
            <strong>Your Role:</strong> ${participant.relationship}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Completion Date:</strong> ${emailData.adminSignedAt.toLocaleString()}
          </div>
          <div style="color: #6c757d; font-size: 14px;">
            <strong>Finalized by:</strong> ${emailData.adminUsername}
          </div>
        </div>
        
        ${emailData.adminNotes ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">📝 Administrator Notes</h4>
            <div style="color: #856404; font-size: 14px;">
              ${emailData.adminNotes}
            </div>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/api/agreement-pdf/${distributionId}" 
             style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            📄 Download Agreement PDF
          </a>
        </div>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h4 style="color: #155724; margin: 0 0 10px 0;">✅ What This Means</h4>
          <ul style="color: #155724; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>The asset distribution has been legally finalized</li>
            <li>All signatures have been verified and recorded</li>
            <li>The agreement is now immutable on the blockchain</li>
            <li>You can download your official copy using the link above</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <h4 style="color: #495057; margin-bottom: 10px;">🔗 Blockchain Information</h4>
          <p style="color: #6c757d; margin-bottom: 10px;">
            This agreement has been permanently recorded on the blockchain, ensuring its authenticity and immutability.
          </p>
          <p style="color: #6c757d; margin: 0;">
            The digital signature and timestamp provide legal proof of the agreement's validity.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <h4 style="color: #495057; margin-bottom: 10px;">📞 Need Help?</h4>
          <p style="color: #6c757d; margin-bottom: 10px;">
            If you have any questions about this agreement or need assistance accessing your documents, please contact our support team.
          </p>
          <p style="color: #6c757d; margin: 0;">
            Keep this email for your records as it contains important information about your asset distribution agreement.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
        <p style="color: #6c757d; font-size: 14px; margin: 0;">
          This is an automated notification from the Asset Distribution System.
        </p>
        <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
          Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Agreement Completed: ${emailData.assetName}

Hello ${participant.fullName},

Great news! The asset distribution agreement for ${emailData.assetName} has been successfully completed and signed by all parties.

Agreement Summary:
- Asset: ${emailData.assetName}
- Asset Type: ${emailData.assetType}
- Distribution Type: ${emailData.distributionType.toUpperCase()}
- Your Role: ${participant.relationship}
- Completion Date: ${emailData.adminSignedAt.toLocaleString()}
- Finalized by: ${emailData.adminUsername}

${emailData.adminNotes ? `Administrator Notes: ${emailData.adminNotes}` : ''}

Download Your Agreement PDF:
${process.env.NEXTAUTH_URL}/api/agreement-pdf/${distributionId}

What This Means:
- The asset distribution has been legally finalized
- All signatures have been verified and recorded
- The agreement is now immutable on the blockchain
- You can download your official copy using the link above

Blockchain Information:
This agreement has been permanently recorded on the blockchain, ensuring its authenticity and immutability.
The digital signature and timestamp provide legal proof of the agreement's validity.

Need Help?
If you have any questions about this agreement or need assistance accessing your documents, please contact our support team.
Keep this email for your records as it contains important information about your asset distribution agreement.

This is an automated notification from the Asset Distribution System.
Please do not reply to this email.
  `;

  try {
    const response = await fetch(process.env.NEXTAUTH_URL + '/api/send-email', {
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

    console.log(`Combined completion and PDF email sent successfully to ${participant.email}`);
  } catch (error) {
    console.error(`Error sending combined completion and PDF email to ${participant.email}:`, error);
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
        email: decryptUserData(owner.email),
        fullName: decryptUserData(owner.fullName),
        relationship: 'Owner',
      });
    }

    // Add other family members who haven't signed yet
    agreement.signatures.forEach(signature => {
      const signedBy = signature.signedBy;
      const decryptedFullName = decryptUserData(signedBy.fullName);
      if (signature.status !== 'signed' && decryptedFullName !== signerName) {
        const decryptedEmail = decryptUserData(signedBy.email);
        if (!participants.some(p => p.email === decryptedEmail)) {
          participants.push({
            email: decryptedEmail,
            fullName: decryptedFullName,
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
          const decryptedEmail = decryptUserData(beneficiary.email);
          const decryptedFullName = decryptUserData(beneficiary.fullName);
          const beneficiarySignature = agreement.signatures.find(sig => decryptUserData(sig.signedBy.email) === decryptedEmail);
          if (!beneficiarySignature || beneficiarySignature.status !== 'signed') {
            if (!participants.some(p => p.email === decryptedEmail)) {
              participants.push({
                email: decryptedEmail,
                fullName: decryptedFullName,
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
          <a href="${process.env.NEXTAUTH_URL}/pages/agreements" 
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

View Agreement Details: ${process.env.NEXTAUTH_URL}/pages/agreements

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
    const response = await fetch(process.env.NEXTAUTH_URL + '/api/send-email', {
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

export async function sendAgreementCreationNotifications(agreementId: string) {
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
            signedBy: true, // Family members who need to sign
          },
        },
      },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Collect all participants who need to sign
    const participants: AgreementParticipant[] = [];
    
    // Add all family members who need to sign with decrypted data
    agreement.signatures.forEach(signature => {
      const signedBy = signature.signedBy;
      const decryptedEmail = decryptUserData(signedBy.email);
      const decryptedFullName = decryptUserData(signedBy.fullName);
      
      // Determine relationship - check if this is the asset owner
      let relationship = 'Family Member';
      if (signedBy.id === agreement.distribution.asset.user.id) {
        relationship = 'Owner';
      }
      
      if (!participants.some(p => p.email === decryptedEmail)) {
        participants.push({
          email: decryptedEmail,
          fullName: decryptedFullName,
          relationship,
        });
      }
    });

    // Add beneficiaries from distribution if they have contact info
    if (agreement.distribution.beneficiaries) {
      const beneficiaries = agreement.distribution.beneficiaries as Beneficiary[];
      
      for (const beneficiary of beneficiaries) {
        if (beneficiary.email && beneficiary.fullName) {
          const decryptedEmail = decryptUserData(beneficiary.email);
          const decryptedFullName = decryptUserData(beneficiary.fullName);
          if (!participants.some(p => p.email === decryptedEmail)) {
            participants.push({
              email: decryptedEmail,
              fullName: decryptedFullName,
              relationship: 'Beneficiary',
            });
          }
        }
      }
    }

    // Prepare email data
    const emailData = {
      assetName: agreement.distribution.asset.name,
      assetType: agreement.distribution.asset.type,
      distributionType: agreement.distribution.type,
      ownerName: decryptUserData(agreement.distribution.asset.user.fullName),
      totalSigners: participants.length,
      createdAt: agreement.createdAt,
    };

    // Send initial agreement creation emails to all participants
    const emailPromises = participants.map(participant => 
      sendAgreementCreationEmail(participant, emailData)
    );

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Count successful emails
    const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
    const failedEmails = emailResults.filter(result => result.status === 'rejected').length;

    return { success: true, emailsSent: successfulEmails, emailsFailed: failedEmails };
  } catch (error) {
    console.error('Error sending agreement creation notification emails:', error);
    throw error;
  }
}

async function sendAgreementCreationEmail(
  participant: AgreementParticipant,
  emailData: {
    assetName: string;
    assetType: string;
    distributionType: string;
    ownerName: string;
    totalSigners: number;
    createdAt: Date;
  }
) {
  const subject = `New Agreement Ready for Signature: ${emailData.assetName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #0c5460; margin: 0 0 10px 0;">📋 New Agreement Requires Your Signature</h2>
        <p style="color: #0c5460; margin: 0;">A new asset distribution agreement has been created and requires your signature to proceed.</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
        <h3 style="color: #495057; margin-top: 0;">Hello ${participant.fullName},</h3>
        
        <p style="color: #6c757d; margin-bottom: 20px;">
          An asset distribution agreement for <strong>${emailData.assetName}</strong> has been created by ${emailData.ownerName} and requires your signature as a ${participant.relationship?.toLowerCase() || 'family member'}.
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
            <strong>Created By:</strong> ${emailData.ownerName}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Your Role:</strong> ${participant.relationship}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Total Signers Required:</strong> ${emailData.totalSigners}
          </div>
          <div style="color: #6c757d; font-size: 14px;">
            <strong>Created On:</strong> ${emailData.createdAt.toLocaleString()}
          </div>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Action Required</h4>
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>Your signature is required</strong> for this asset distribution agreement. 
            Please review the agreement details and provide your digital signature to proceed with the distribution process.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/pages/agreements" 
             style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            📝 Review & Sign Agreement
          </a>
        </div>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h4 style="color: #155724; margin: 0 0 10px 0;">📚 What You Need to Know</h4>
          <ul style="color: #155724; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>This agreement outlines how the asset will be distributed</li>
            <li>All required signers must approve before final completion</li>
            <li>Your signature will be recorded on the blockchain for security</li>
            <li>You can review all details before signing</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <h4 style="color: #495057; margin-bottom: 10px;">🕒 Next Steps</h4>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
            <ol style="color: #6c757d; margin: 0; padding-left: 20px; font-size: 14px;">
              <li>Click the "Review & Sign Agreement" button above</li>
              <li>Log in to your account if prompted</li>
              <li>Review the agreement details carefully</li>
              <li>Provide your digital signature when ready</li>
              <li>You'll receive updates as other family members sign</li>
            </ol>
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h4 style="color: #495057; margin: 0 0 10px 0;">💡 Questions?</h4>
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            If you have any questions about this agreement or the signing process, please contact the agreement creator 
            or reach out to our support team for assistance.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <h4 style="color: #495057; margin-bottom: 10px;">🔒 Security & Privacy</h4>
          <p style="color: #6c757d; margin-bottom: 10px;">
            Your signature will be securely recorded on the blockchain, ensuring the agreement's authenticity and immutability.
          </p>
          <p style="color: #6c757d; margin: 0;">
            All personal information is encrypted and protected according to our privacy policy.
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
New Agreement Ready for Signature: ${emailData.assetName}

Hello ${participant.fullName},

An asset distribution agreement for ${emailData.assetName} has been created by ${emailData.ownerName} and requires your signature as a ${participant.relationship?.toLowerCase() || 'family member'}.

Agreement Details:
- Asset: ${emailData.assetName}
- Asset Type: ${emailData.assetType}
- Distribution Type: ${emailData.distributionType.toUpperCase()}
- Created By: ${emailData.ownerName}
- Your Role: ${participant.relationship}
- Total Signers Required: ${emailData.totalSigners}
- Created On: ${emailData.createdAt.toLocaleString()}

⚠️ Action Required:
Your signature is required for this asset distribution agreement. Please review the agreement details and provide your digital signature to proceed with the distribution process.

Review & Sign Agreement: ${process.env.NEXTAUTH_URL}/pages/agreements

What You Need to Know:
- This agreement outlines how the asset will be distributed
- All required signers must approve before final completion
- Your signature will be recorded on the blockchain for security
- You can review all details before signing

Next Steps:
1. Click the "Review & Sign Agreement" link above
2. Log in to your account if prompted
3. Review the agreement details carefully
4. Provide your digital signature when ready
5. You'll receive updates as other family members sign

Questions?
If you have any questions about this agreement or the signing process, please contact the agreement creator or reach out to our support team for assistance.

Security & Privacy:
Your signature will be securely recorded on the blockchain, ensuring the agreement's authenticity and immutability.
All personal information is encrypted and protected according to our privacy policy.

This is an automated notification from the Will Estate Management Service Provider (WEMSP).
Please do not reply to this email.
  `;

  try {
    const response = await fetch(process.env.NEXTAUTH_URL + '/api/send-email', {
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

    console.log(`Agreement creation notification email sent successfully to ${participant.email}`);
  } catch (error) {
    console.error(`Error sending agreement creation notification email to ${participant.email}:`, error);
    throw error;
  }
}

