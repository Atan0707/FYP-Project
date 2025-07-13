import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { sendAgreementCompletionEmails } from '@/services/agreementEmailService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notes } = await request.json();

    // Find the admin info
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Find the agreement and its distribution
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: (await params).id,
        status: 'pending_admin',
      },
      include: {
        distribution: {
          include: {
            agreement: true,
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found or not ready for admin signature' },
        { status: 404 }
      );
    }

    // Format admin notes with username
    const adminNotesWithUsername = notes 
      ? `[${admin.username}] ${notes}`
      : `Signed by ${admin.username}`;

    // Update all agreements in the distribution to completed
    await prisma.agreement.updateMany({
      where: {
        distributionId: agreement.distributionId,
        status: 'pending_admin',
      },
      data: {
        status: 'completed',
        adminSignedAt: new Date(),
        adminNotes: adminNotesWithUsername,
      },
    });

    // Update the distribution status to completed
    await prisma.assetDistribution.update({
      where: { id: agreement.distributionId },
      data: { status: 'completed' },
    });

    // Get the updated agreement for response
    const updatedAgreement = await prisma.agreement.findFirst({
      where: { id: (await params).id },
      include: {
        distribution: {
          include: {
            asset: true,
            agreement: true,
          },
        },
      },
    });

    // Send email notifications to all agreement participants
    try {
      await sendAgreementCompletionEmails((await params).id);
      console.log('Agreement completion emails sent successfully');
    } catch (emailError) {
      console.error('Error sending agreement completion emails:', emailError);
      // Don't fail the main request if email fails
    }

    return NextResponse.json(updatedAgreement);
  } catch (error) {
    console.error('Error signing agreement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 