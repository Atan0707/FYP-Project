import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// Function to generate 5-digit verification code
function generateVerificationCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Function to send verification email
async function sendVerificationEmail(email: string, code: string, fullName: string, assetName: string) {
  try {
    const response = await fetch(process.env.NEXTAUTH_URL + '/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Agreement Signing Verification - Islamic Inheritance System',
        text: `Dear ${fullName},

You are about to sign an agreement for the asset: ${assetName}

Your verification code is: ${code}

This code will expire in 10 minutes. Please enter this code to proceed with signing the agreement.

If you did not request this action, please ignore this email and contact support immediately.

Best regards,
Islamic Inheritance System Team`
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
      },
    });

    // Verify the agreement exists and user has access to it
    const agreement = await prisma.familySignature.findFirst({
      where: {
        agreementId,
        signedById: userId,
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

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found or not accessible' }, { status: 404 });
    }

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
        email: user?.email || '',
        verificationCode,
        expiresAt,
      },
    });

    // Send verification email
    await sendVerificationEmail(
      user?.email || '', 
      verificationCode, 
      user?.fullName || '', 
      agreement.agreement.distribution.asset.name
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent to your email. Please check your email and enter the code.',
    });
  } catch (error) {
    console.error('Error generating verification code:', error);
    return NextResponse.json({ 
      error: 'Failed to generate verification code: ' + String(error)
    }, { status: 500 });
  }
} 