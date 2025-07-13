'use server'

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

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

Your verification code is: ${code}

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

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'All fields are required' };
  }

  try {
    // First, check if user exists in the main User table
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // User exists, proceed with normal login
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return { error: 'Invalid credentials' };
      }

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set('userId', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return { success: true };
    }

    // User doesn't exist in main table, check temporary users
    const tempUser = await prisma.temporaryUser.findFirst({
      where: { email }
    });

    if (tempUser) {
      // Check if password matches
      const passwordMatch = await bcrypt.compare(password, tempUser.password);

      if (!passwordMatch) {
        return { error: 'Invalid credentials' };
      }

      // Check if verification code is still valid
      if (tempUser.expiresAt <= new Date()) {
        // Code expired, generate new one
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

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
          requiresVerification: true, 
          message: 'Your verification code expired. A new code has been sent to your email.',
          email: tempUser.email,
          fullName: tempUser.fullName
        };
      }

      // Verification code is still valid, resend it
      await sendVerificationEmail(email, tempUser.verificationCode, tempUser.fullName);

      return { 
        requiresVerification: true, 
        message: 'Please verify your email address. A verification code has been sent to your email.',
        email: tempUser.email,
        fullName: tempUser.fullName
      };
    }

    // Neither regular user nor temporary user found
    return { error: 'Invalid credentials' };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Something went wrong during login' };
  }
}

export async function verifyEmailLogin(formData: FormData) {
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

export async function resendVerificationCodeLogin(formData: FormData) {
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

// New function to initiate password reset
export async function initiatePasswordReset(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required' };
  }

  try {
    // Call the reset-password API endpoint to initiate the reset
    const response = await fetch(process.env.NEXTAUTH_URL + '/api/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        action: 'initiate'
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to initiate password reset' };
    }

    return { 
      success: true, 
      message: result.message || 'If your email is registered, you will receive a password reset code.'
    };
  } catch (error) {
    console.error('Error initiating password reset:', error);
    return { error: 'Something went wrong while initiating password reset' };
  }
}

// New function to verify reset code
export async function verifyResetCode(formData: FormData) {
  const email = formData.get('email') as string;
  const token = formData.get('token') as string;

  if (!email || !token) {
    return { error: 'Email and verification code are required' };
  }

  try {
    // Call the reset-password API endpoint to verify the code
    const response = await fetch(process.env.NEXTAUTH_URL + '/api/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        token,
        action: 'verify'
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to verify reset code' };
    }

    return { 
      success: true, 
      message: result.message || 'Reset code verified successfully'
    };
  } catch (error) {
    console.error('Error verifying reset code:', error);
    return { error: 'Something went wrong while verifying reset code' };
  }
}

// New function to complete password reset
export async function completePasswordReset(formData: FormData) {
  const email = formData.get('email') as string;
  const token = formData.get('token') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!email || !token || !newPassword) {
    return { error: 'All fields are required' };
  }

  try {
    // Call the reset-password API endpoint to complete the reset
    const response = await fetch(process.env.NEXTAUTH_URL + '/api/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        token,
        newPassword,
        action: 'reset'
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to reset password' };
    }

    return { 
      success: true, 
      message: result.message || 'Password reset successfully'
    };
  } catch (error) {
    console.error('Error completing password reset:', error);
    return { error: 'Something went wrong while resetting password' };
  }
} 