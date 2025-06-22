import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Delete all expired temporary users
    const result = await prisma.temporaryUser.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Cleaned up ${result.count} expired temporary users` 
    }, { status: 200 });
  } catch (error) {
    console.error('Error cleaning up temporary users:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup temporary users', 
      details: String(error) 
    }, { status: 500 });
  }
}

export async function POST() {
  // Same as GET for flexibility
  return GET();
} 