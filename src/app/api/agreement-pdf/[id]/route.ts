import { NextRequest, NextResponse } from 'next/server';
import { pdf, Document } from '@react-pdf/renderer';
import { createElement } from 'react';
import { AgreementPDF } from '@/components/AgreementPDF';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface AgreementDetails {
  id: string;
  status: string;
  signedAt?: string;
  notes?: string;
  familyMember?: {
    id: string;
    fullName: string;
    relationship: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('Fetching distribution data...');
    // Get the distribution and its agreements
    const distribution = await prisma.assetDistribution.findUnique({
      where: { id: params.id },
      include: {
        asset: true,
        agreement: {
          include: {
            signatures: true,
          },
        },
      },
    });

    if (!distribution) {
      console.log('Distribution not found:', params.id);
      return NextResponse.json(
        { error: 'Distribution not found' },
        { status: 404 }
      );
    }

    console.log('Distribution found:', {
      id: distribution.id,
      assetName: distribution.asset.name,
      type: distribution.type,
      signatureCount: distribution.agreement?.signatures.length || 0
    });

    // Get family members for the signatures
    const familyMembers = await prisma.family.findMany({
      where: {
        id: {
          in: distribution.agreement?.signatures.map(sig => sig.familyId) || []
        }
      }
    });

    console.log('Family members found:', familyMembers.length);

    // Map family members to signatures
    const agreementsWithDetails: AgreementDetails[] = distribution.agreement?.signatures.map(signature => {
      const familyMember = familyMembers.find(fm => fm.id === signature.familyId);
      console.log('Processing signature:', {
        signatureId: signature.id,
        familyMemberId: signature.familyId,
        familyMemberFound: !!familyMember
      });
      
      return {
        id: signature.id,
        status: signature.status,
        signedAt: signature.signedAt?.toISOString(),
        notes: signature.notes || undefined,
        familyMember: familyMember ? {
          id: familyMember.id,
          fullName: familyMember.fullName,
          relationship: familyMember.relationship,
        } : undefined
      };
    }) || [];

    console.log('Processed agreements:', agreementsWithDetails.length);

    // Check if user has access to this distribution
    const hasAccess = familyMembers.some(
      member => member.userId === user.id || member.relatedUserId === user.id
    );

    if (!hasAccess) {
      console.log('Access denied for user:', user.id);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    console.log('Creating PDF document...');
    try {
      // Create the PDF document with proper Document wrapper
      const pdfInstance = pdf(
        createElement(Document, {},
          createElement(AgreementPDF, {
            assetName: distribution.asset.name,
            distributionType: distribution.type,
            agreements: agreementsWithDetails,
            createdAt: distribution.createdAt.toISOString(),
          })
        )
      );

      // Generate PDF blob
      const pdfBlob = await pdfInstance.toBlob();
      
      // Convert blob to buffer
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const pdfBuffer = Buffer.from(pdfArrayBuffer);
      
      console.log('PDF buffer created, size:', pdfBuffer.byteLength);

      // Return the PDF with proper headers
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="agreement-${params.id}.pdf"`,
        },
      });
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      console.error('PDF data:', {
        assetName: distribution.asset.name,
        distributionType: distribution.type,
        agreementsCount: agreementsWithDetails.length,
        createdAt: distribution.createdAt.toISOString(),
      });
      throw pdfError;
    }
  } catch (error) {
    console.error('Error in agreement PDF route:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to generate PDF: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 