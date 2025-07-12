import { NextResponse } from 'next/server';
import { sendAgreementCompletionEmails } from '@/services/agreementEmailService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Call the email service
    const result = await sendAgreementCompletionEmails(id);
    
    return NextResponse.json(result, { status: 200 });  
  } catch (error) {
    console.error('Error sending agreement notifications:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
} 