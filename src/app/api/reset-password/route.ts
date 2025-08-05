import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { decrypt } from '@/services/encryption';
import { normalizeEmail } from '@/lib/utils';

const prisma = new PrismaClient();

// Generate a 5-digit verification code
function generateVerificationCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Handle the request to initiate password reset
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email: rawEmail, token, newPassword, action } = body;

    // Normalize email for consistent comparison
    const email = rawEmail ? normalizeEmail(rawEmail) : null;

    // If only email is provided, initiate the password reset
    if (email && !token && !newPassword && action === 'initiate') {
      // Check if user exists by decrypting stored emails
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
        }
      });

      let foundUser = null;
      for (const user of users) {
        try {
          const decryptedEmail = decrypt(user.email);
          if (decryptedEmail === email) {
            foundUser = user;
            break;
          }
        } catch (error) {
          console.error('Error decrypting user email:', error);
          continue;
        }
      }

      if (!foundUser) {
        // For security reasons, don't reveal if the email exists or not
        return NextResponse.json({ success: true, message: 'If your email is registered, you will receive a password reset code.' });
      }

      // Generate a 5-digit verification code
      const verificationCode = generateVerificationCode();
      
      // Set expiration time (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Delete any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email },
      });

      // Create a new token (store the original email, not encrypted)
      await prisma.passwordResetToken.create({
        data: {
          email,
          token: verificationCode,
          expiresAt,
        },
      });

      // Send the reset code via email
      const response = await fetch(process.env.NEXTAUTH_URL + '/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Password Reset - Islamic Inheritance System',
          text: `Dear User,

You have requested to reset your password for the Islamic Inheritance System.

Your password reset code is: ${verificationCode}

This code will expire in 1 hour. Please enter this code on the password reset page.

If you did not request this password reset, please ignore this email.

Best regards,
Islamic Inheritance System Team`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Password reset code sent successfully' 
      });
    }
    
    // If token is provided but no new password, verify the token
    else if (email && token && !newPassword && action === 'verify') {
      // Find the token
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          email,
          token,
          expiresAt: {
            gt: new Date() // Check if not expired
          }
        }
      });

      if (!resetToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid or expired reset code' 
        }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Reset code verified successfully' 
      });
    }
    
    // If token and new password are provided, complete the password reset
    else if (email && token && newPassword && action === 'reset') {
      // Find the token
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          email,
          token,
          expiresAt: {
            gt: new Date() // Check if not expired
          }
        }
      });

      if (!resetToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid or expired reset code' 
        }, { status: 400 });
      }

      // Find the user by decrypting stored emails
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
        }
      });

      let foundUser = null;
      for (const user of users) {
        try {
          const decryptedEmail = decrypt(user.email);
          if (decryptedEmail === email) {
            foundUser = user;
            break;
          }
        } catch (error) {
          console.error('Error decrypting user email:', error);
          continue;
        }
      }

      if (!foundUser) {
        return NextResponse.json({ 
          success: false, 
          error: 'User not found' 
        }, { status: 404 });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      await prisma.user.update({
        where: { id: foundUser.id },
        data: { password: hashedPassword },
      });

      // Delete the used token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Password reset successfully' 
      });
    }
    
    else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request parameters' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in password reset:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Something went wrong during password reset' 
    }, { status: 500 });
  }
} 