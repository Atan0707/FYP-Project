import { NextRequest, NextResponse } from 'next/server';
import { pdf, Document } from '@react-pdf/renderer';
import { createElement } from 'react';
import { AgreementPDF } from '@/components/AgreementPDF';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Define a simpler user type that matches what getCurrentUser returns
interface ExtendedUser {
  id: string;
  email: string;
  role?: string;
  [key: string]: any; // Allow additional properties
}

interface AgreementDetails {
  id: string;
  status: string;
  signedAt?: string;
  notes?: string;
  transactionHash?: string;
  familyMember?: {
    id: string;
    fullName: string;
    relationship: string;
    ic: string;
    email?: string;
    phone?: string;
  };
}

interface Distribution {
  id: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  asset: {
    name: string;
    type: string;
    value: number;
    description?: string;
    user: {
      fullName: string;
      ic: string;
    };
  };
  agreement?: {
    id: string;
    signatures: any[];
  };
  [key: string]: any; // Allow additional properties
}

interface DistributionData {
  distribution: Distribution;
  agreementsWithDetails: AgreementDetails[];
  hasAccess: boolean;
  error?: string;
  status?: number;
}

// Helper function to get distribution data
async function getDistributionData(id: string, user: ExtendedUser): Promise<DistributionData | null> {
  console.log('Fetching distribution data...');
  // Get the distribution and its agreements
  const distribution = await prisma.assetDistribution.findUnique({
    where: { id },
    include: {
      asset: {
        include: {
          user: true, // Include the asset owner (benefactor)
        },
      },
      agreement: {
        include: {
          signatures: true,
        },
      },
    },
  });

  if (!distribution) {
    console.log('Distribution not found:', id);
    return null;
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
    },
    include: {
      user: {
        select: {
          email: true,
        }
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
      transactionHash: signature.transactionHash || undefined,
      familyMember: familyMember ? {
        id: familyMember.id,
        fullName: familyMember.fullName,
        relationship: familyMember.relationship,
        ic: familyMember.ic,
        email: familyMember.user?.email,
        phone: familyMember.phone || undefined,
      } : undefined
    };
  }) || [];

  console.log('Processed agreements:', agreementsWithDetails.length);

  // Check if user has access to this distribution (or if it's an admin)
  const isAdmin = user.role === 'ADMIN';
  const hasAccess = isAdmin || familyMembers.some(
    member => member.userId === user.id || member.relatedUserId === user.id
  );

  if (!hasAccess) {
    console.log('Access denied for user:', user.id);
    return { 
      distribution: distribution as Distribution,
      agreementsWithDetails,
      hasAccess: false,
      error: 'Unauthorized', 
      status: 403 
    };
  }

  return {
    distribution: distribution as Distribution,
    agreementsWithDetails,
    hasAccess
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

    const id = params.id;
    const format = request.nextUrl.searchParams.get('format');
    
    // If format is JSON, return JSON data instead of PDF
    if (format === 'json') {
      return await handleJsonRequest(id, user as ExtendedUser);
    }

    const data = await getDistributionData(id, user as ExtendedUser);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Distribution not found' },
        { status: 404 }
      );
    }
    
    if (data.error) {
      return NextResponse.json(
        { error: data.error },
        { status: data.status }
      );
    }

    const { distribution, agreementsWithDetails } = data;

    if (!distribution || !distribution.asset || !distribution.agreement) {
      return NextResponse.json(
        { error: 'Invalid distribution data' },
        { status: 500 }
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
            benefactorName: distribution.asset.user.fullName,
            benefactorIC: distribution.asset.user.ic,
            assetValue: distribution.asset.value,
            assetDescription: distribution.asset.description,
            agreementId: distribution.agreement?.id,
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
          'Content-Disposition': `inline; filename="agreement-${id}.pdf"`,
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

// Handle JSON request for agreement data
async function handleJsonRequest(id: string, user: ExtendedUser) {
  try {
    const data = await getDistributionData(id, user);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Distribution not found' },
        { status: 404 }
      );
    }
    
    if (data.error) {
      return NextResponse.json(
        { error: data.error },
        { status: data.status }
      );
    }

    const { distribution, agreementsWithDetails } = data;

    if (!distribution || !distribution.asset || !distribution.agreement) {
      return NextResponse.json(
        { error: 'Invalid distribution data' },
        { status: 500 }
      );
    }

    // Return JSON data
    return NextResponse.json({
      id: distribution.agreement?.id,
      assetName: distribution.asset.name,
      assetType: distribution.asset.type,
      assetValue: distribution.asset.value,
      assetDescription: distribution.asset.description,
      distributionType: distribution.type,
      distributionId: distribution.id,
      createdAt: distribution.createdAt.toISOString(),
      updatedAt: distribution.updatedAt.toISOString(),
      benefactorName: distribution.asset.user.fullName,
      benefactorIC: distribution.asset.user.ic,
      agreements: agreementsWithDetails,
    });
  } catch (error) {
    console.error('Error in agreement JSON route:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to get agreement data: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to get agreement data' },
      { status: 500 }
    );
  }
} 