import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { decrypt } from '@/services/encryption';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Find all admins and decrypt usernames to find match
    const admins = await prisma.admin.findMany();
    let admin = null;
    
    for (const adminRecord of admins) {
      try {
        const decryptedUsername = decrypt(adminRecord.username);
        if (decryptedUsername === username) {
          admin = adminRecord;
          break;
        }
      } catch {
        // Handle case where username might not be encrypted (backward compatibility)
        if (adminRecord.username === username) {
          admin = adminRecord;
          break;
        }
      }
    }

    if (!admin) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token using jose
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    
    // Decrypt username for token (or use original if decryption fails)
    let tokenUsername = username;
    try {
      tokenUsername = decrypt(admin.username);
    } catch {
      tokenUsername = admin.username; // Fallback for backward compatibility
    }
    
    const token = await new jose.SignJWT({ adminId: admin.id, username: tokenUsername })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(secret);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 