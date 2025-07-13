'use server';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Function to generate 5-digit verification code
function generateVerificationCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Function to send verification email
async function sendVerificationEmail(email: string, code: string, fullName: string) {
  try {
    const subject = 'Email Verification - WEMSP';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0 0 10px 0;">Welcome to Will Estate Management Service Provider (WEMSP)</h2>
          <p style="color: #155724; margin: 0;">Please verify your email address to complete your registration.</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #495057; margin-top: 0;">Hello ${fullName},</h3>
          
          <p style="color: #6c757d; margin-bottom: 20px;">
            Thank you for registering with the Will Estate Management Service Provider (WEMSP). To complete your registration, please verify your email address using the verification code below.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h4 style="color: #495057; margin: 0 0 15px 0;">Your Verification Code</h4>
            <div style="background-color: #007bff; color: white; padding: 15px 25px; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 3px; display: inline-block;">
              ${code}
            </div>
            <p style="color: #6c757d; margin: 15px 0 0 0; font-size: 14px;">
              This code will expire in 1 hour
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <h4 style="color: #495057; margin-bottom: 10px;">How to verify:</h4>
            <ol style="color: #6c757d; margin: 0; padding-left: 20px;">
              <li>Return to the registration page</li>
              <li>Enter the verification code above</li>
              <li>Click "Verify Email" to complete your registration</li>
            </ol>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Important Security Notice</h4>
            <p style="color: #856404; margin: 0; font-size: 14px;">
              If you did not request this registration, please ignore this email. The verification code will expire automatically in 1 hour.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <h4 style="color: #495057; margin-bottom: 10px;">Need Help?</h4>
            <p style="color: #6c757d; margin-bottom: 10px;">
              If you're having trouble with verification, you can request a new verification code on the registration page.
            </p>
            <p style="color: #6c757d; margin: 0;">
              For additional support, please contact our support team.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            This is an automated email from the Will Estate Management Service Provider (WEMSP).
          </p>
          <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const textContent = `
Welcome to Islamic Inheritance System

Hello ${fullName},

Thank you for registering with the Will Estate Management Service Provider (WEMSP). To complete your registration, please verify your email address using the verification code below.

Your Verification Code: ${code}

This code will expire in 1 hour.

How to verify:
1. Return to the registration page
2. Enter the verification code above
3. Click "Verify Email" to complete your registration

Important Security Notice:
If you did not request this registration, please ignore this email. The verification code will expire automatically in 1 hour.

Need Help?
If you're having trouble with verification, you can request a new verification code on the registration page.
For additional support, please contact our support team.

This is an automated email from the Will Estate Management Service Provider (WEMSP).
Please do not reply to this email.
    `;

    const response = await fetch(process.env.NEXTAUTH_URL + '/api/send-email', {
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
      throw new Error('Failed to send email');
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const ic = formData.get('ic') as string;
  const phone = formData.get('phone') as string;

  if (!email || !password || !fullName || !ic || !phone) {
    return { error: 'All fields are required' };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { ic }
        ]
      }
    });

    if (existingUser) {
      return { error: 'User already exists with this email or IC' };
    }

    // Check if there's already a temporary user with this email or IC
    const existingTempUser = await prisma.temporaryUser.findFirst({
      where: {
        OR: [
          { email },
          { ic }
        ]
      }
    });

    if (existingTempUser) {
      // Delete the existing temporary user before creating a new one
      await prisma.temporaryUser.delete({
        where: { id: existingTempUser.id }
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Create temporary user
    await prisma.temporaryUser.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        ic,
        phone,
        verificationCode,
        expiresAt,
      },
    });

    // Send verification email
    await sendVerificationEmail(email, verificationCode, fullName);

    return { 
      success: true, 
      message: 'Verification email sent. Please check your email and enter the verification code.',
      requiresVerification: true 
    };
  } catch (error) {
    console.error('Error during signup:', error);
    return { error: 'Something went wrong during signup' };
  }
}

export async function verifyEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const verificationCode = formData.get('verificationCode') as string;

  if (!email || !verificationCode) {
    return { error: 'Email and verification code are required' };
  }

  try {
    const response = await fetch(process.env.NEXTAUTH_URL + '/api/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        verificationCode,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Verification failed' };
    }

    return { success: true, message: result.message };
  } catch (error) {
    console.error('Error during verification:', error);
    return { error: 'Something went wrong during verification' };
  }
}

export async function resendVerificationCode(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required' };
  }

  try {
    // Find the temporary user
    const tempUser = await prisma.temporaryUser.findFirst({
      where: { email }
    });

    if (!tempUser) {
      return { error: 'No pending verification found for this email' };
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();

    // Set new expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Update the temporary user with new code and expiration
    await prisma.temporaryUser.update({
      where: { id: tempUser.id },
      data: {
        verificationCode,
        expiresAt,
      }
    });

    // Send new verification email
    await sendVerificationEmail(email, verificationCode, tempUser.fullName);

    return { 
      success: true, 
      message: 'New verification code sent to your email.' 
    };
  } catch (error) {
    console.error('Error resending verification code:', error);
    return { error: 'Something went wrong while resending verification code' };
  }
}
