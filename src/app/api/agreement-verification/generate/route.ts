import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

// Function to generate 5-digit verification code
function generateVerificationCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Malaysian IC validation function
// function validateMalaysianIC(ic: string): boolean {
//   // Remove dashes if present
//   const cleanedValue = ic.replace(/-/g, '');
  
//   // Check if it's 12 digits
//   if (!/^\d{12}$/.test(cleanedValue)) return false;
  
//   // Extract date part (first 6 digits)
//   const year = parseInt(cleanedValue.substring(0, 2));
//   const month = parseInt(cleanedValue.substring(2, 4));
//   const day = parseInt(cleanedValue.substring(4, 6));
  
//   // Validate date
//   const currentYear = new Date().getFullYear() % 100;
//   const century = year > currentYear ? 1900 : 2000;
//   const fullYear = century + year;
  
//   const date = new Date(fullYear, month - 1, day);
//   const isValidDate = date.getFullYear() === fullYear && 
//                       date.getMonth() === month - 1 && 
//                       date.getDate() === day;
  
//   // Month should be between 1-12, day should be valid for the month
//   return month >= 1 && month <= 12 && isValidDate;
// }

// Function to send verification email
async function sendVerificationEmail(email: string, code: string, fullName: string, assetName: string) {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #0c5460; margin: 0 0 10px 0;">🔐 Agreement Signing Verification</h2>
          <p style="color: #0c5460; margin: 0;">Please verify your identity to proceed with signing the agreement.</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #495057; margin-top: 0;">Hello ${fullName},</h3>
          
          <p style="color: #6c757d; margin-bottom: 20px;">
            You are about to sign an agreement for the asset: <strong>${assetName}</strong>. 
            To ensure security and authenticity, please verify your identity using the verification code below.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h4 style="color: #495057; margin: 0 0 15px 0;">Your Verification Code</h4>
            <div style="background-color: #007bff; color: white; padding: 15px 25px; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 3px; display: inline-block;">
              ${code}
            </div>
            <p style="color: #6c757d; margin: 15px 0 0 0; font-size: 14px;">
              This code will expire in 10 minutes
            </p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Action Required</h4>
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>Enter this verification code</strong> on the agreement signing page to proceed with your digital signature.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <h4 style="color: #495057; margin-bottom: 10px;">🕒 Next Steps</h4>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
              <ol style="color: #6c757d; margin: 0; padding-left: 20px; font-size: 14px;">
                <li>Return to the agreement signing page</li>
                <li>Enter the verification code above</li>
                <li>Click "Verify & Sign" to complete your signature</li>
                <li>Your signature will be recorded on the blockchain</li>
              </ol>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
            <h4 style="color: #495057; margin: 0 0 10px 0;">💡 Important Security Notice</h4>
            <p style="color: #6c757d; margin: 0; font-size: 14px;">
              If you did not request this action, please ignore this email and contact support immediately. 
              The verification code will expire automatically in 10 minutes.
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
Agreement Signing Verification - ${assetName}

Hello ${fullName},

You are about to sign an agreement for the asset: ${assetName}. To ensure security and authenticity, please verify your identity using the verification code below.

Your Verification Code: ${code}

This code will expire in 10 minutes.

Action Required:
Enter this verification code on the agreement signing page to proceed with your digital signature.

Next Steps:
1. Return to the agreement signing page
2. Enter the verification code above
3. Click "Verify & Sign" to complete your signature
4. Your signature will be recorded on the blockchain

Important Security Notice:
If you did not request this action, please ignore this email and contact support immediately. The verification code will expire automatically in 10 minutes.

Security & Privacy:
Your signature will be securely recorded on the blockchain, ensuring the agreement's authenticity and immutability.
All personal information is encrypted and protected according to our privacy policy.

This is an automated notification from the Will Estate Management Service Provider (WEMSP).
Please do not reply to this email.
    `;

    const response = await fetch(process.env.NEXTAUTH_URL + '/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Agreement Signing Verification - Islamic Inheritance System',
        text: textContent,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { agreementId } = await request.json();

    if (!agreementId) {
      return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 });
    }

    // // Validate IC format
    // if (!validateMalaysianIC(signerIC)) {
    //   return NextResponse.json({ error: 'Invalid IC number format. Please enter a valid Malaysian IC number.' }, { status: 400 });
    // }

    // Get user from cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        ic: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Decrypt user data for validation and email
    let decryptedFullName = user.fullName;
    let decryptedEmail = user.email;
    let decryptedIC = user.ic;

    try {
      decryptedFullName = decrypt(user.fullName);
    } catch (error) {
      console.error('Error decrypting user fullName:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    try {
      decryptedEmail = decrypt(user.email);
    } catch (error) {
      console.error('Error decrypting user email:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    try {
      decryptedIC = decrypt(user.ic);
    } catch (error) {
      console.error('Error decrypting user IC:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    // Use the authenticated user's IC for signing
    const signerIC = decryptedIC;

    // Verify the agreement exists and user has access to it
    // First check if the agreement exists
    const agreementExists = await prisma.agreement.findUnique({
      where: {
        id: agreementId
      }
    });

    if (!agreementExists) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Then check if the user has access to sign this agreement
    // First get all family IDs where the user is a family member
    const familyIds = (await prisma.family.findMany({
      where: { userId },
      select: { id: true },
    })).map(f => f.id);

    // Then find the signature for this agreement where the user is a family member
    const signature = await prisma.familySignature.findFirst({
      where: {
        agreementId,
        familyId: {
          in: familyIds,
        },
        status: 'pending'
      },
      include: {
        agreement: {
          include: {
            distribution: {
              include: {
                asset: true
              }
            }
          }
        }
      }
    });

    console.log('signature: ', signature);

    if (!signature) {
      return NextResponse.json({ error: 'You are not authorized to sign this agreement or no pending signature found' }, { status: 403 });
    }

    // Use the signature as the agreement for the rest of the function
    const agreement = signature;

    // Check if there's already a verification code for this agreement and user
    const existingVerification = await prisma.temporaryAgreementVerification.findFirst({
      where: {
        agreementId,
        userId: userId
      }
    });

    if (existingVerification) {
      // Delete the existing verification before creating a new one
      await prisma.temporaryAgreementVerification.delete({
        where: { id: existingVerification.id }
      });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Create temporary verification record
    await prisma.temporaryAgreementVerification.create({
      data: {
        agreementId,
        userId: userId,
        email: decryptedEmail,
        verificationCode,
        expiresAt,
      },
    });

    // Send verification email with decrypted data
    await sendVerificationEmail(
      decryptedEmail, 
      verificationCode, 
      decryptedFullName, 
      agreement.agreement.distribution.asset.name
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent to your email. Please check your email and enter the code.',
      signerIC: signerIC // Return the user's IC for frontend use
    });
  } catch (error) {
    console.error('Error generating verification code:', error);
    return NextResponse.json({ 
      error: 'Failed to generate verification code: ' + String(error)
    }, { status: 500 });
  }
} 