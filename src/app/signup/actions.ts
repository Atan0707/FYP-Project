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
    const response = await fetch(process.env.NEXTAUTH_URL + '/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Email Verification - Islamic Inheritance System',
        text: `Dear ${fullName},

Thank you for registering with the Islamic Inheritance System.

Your verification code is: **${code}**

This code will expire in 1 hour. Please enter this code on the verification page to complete your registration.

If you did not request this registration, please ignore this email.

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
