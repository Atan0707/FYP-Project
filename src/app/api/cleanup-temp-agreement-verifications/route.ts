import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Delete all expired temporary agreement verification records
    const result = await prisma.temporaryAgreementVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Cleaned up ${result.count} expired agreement verification records` 
    }, { status: 200 });
  } catch (error) {
    console.error('Error cleaning up temporary agreement verifications:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup temporary agreement verifications', 
      details: String(error) 
    }, { status: 500 });
  }
}

export async function POST() {
  // Same as GET for flexibility
  return GET();
} 