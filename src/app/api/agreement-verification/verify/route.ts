import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { agreementId, verificationCode } = await request.json();

    if (!agreementId || !verificationCode) {
      return NextResponse.json({ error: 'Agreement ID and verification code are required' }, { status: 400 });
    }

    // Get user from cookies
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    // Find the verification record
    const verification = await prisma.temporaryAgreementVerification.findFirst({
      where: {
        agreementId,
        userId: user.id,
        verificationCode,
        expiresAt: {
          gt: new Date() // Not expired
        }
      }
    });

    if (!verification) {
      return NextResponse.json({ 
        error: 'Invalid or expired verification code. Please request a new code.' 
      }, { status: 400 });
    }

    // Delete the verification record since it's been used
    await prisma.temporaryAgreementVerification.delete({
      where: { id: verification.id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Verification successful. You can now proceed with signing the agreement.'
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ 
      error: 'Failed to verify code',
      details: String(error)
    }, { status: 500 });
  }
} 