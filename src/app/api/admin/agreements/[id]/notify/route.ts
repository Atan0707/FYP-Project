import { NextRequest, NextResponse } from 'next/server';
import { sendAgreementCompletionEmails } from '@/services/agreementEmailService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agreementId } = await params;
    
    if (!agreementId) {
      return NextResponse.json(
        { error: 'Agreement ID is required' },
        { status: 400 }
      );
    }

    const result = await sendAgreementCompletionEmails(agreementId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending agreement completion emails:', error);
    return NextResponse.json(
      { error: 'Failed to send agreement completion emails' },
      { status: 500 }
    );
  }
} 