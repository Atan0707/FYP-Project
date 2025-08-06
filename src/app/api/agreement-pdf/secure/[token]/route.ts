import { NextRequest, NextResponse } from 'next/server';
import { pdf, Document } from '@react-pdf/renderer';
import { createElement } from 'react';
import { AgreementPDF } from '@/components/AgreementPDF';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/services/encryption';
import { verifySecurePDFToken } from '@/lib/secureTokens';

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
    signatures: {
      id: string;
      familyId: string;
      status: string;
      signedAt?: Date;
      notes?: string;
      transactionHash?: string;
    }[];
    adminSignedAt?: Date | null;
    adminNotes?: string | null;
  };
  [key: string]: unknown;
}



// Helper function to get distribution data for secure access
async function getDistributionDataSecure(distributionId: string, userEmail: string): Promise<{
  distribution: Distribution;
  agreementsWithDetails: AgreementDetails[];
  adminName: string;
  adminNotes?: string;
  error?: string;
  status?: number;
} | null> {
  console.log('Fetching distribution data for secure access...');
  
  // Get the distribution and its agreements
  const distribution = await prisma.assetDistribution.findUnique({
    where: { id: distributionId },
    include: {
      asset: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              ic: true,
              email: true,
            },
          },
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
    console.log('Distribution not found:', distributionId);
    return null;
  }

  // Get admin information if the agreement has been signed by an admin
  let adminName = 'Admin';
  let formattedAdminNotes = distribution.agreement?.adminNotes || undefined;
  
  if (distribution.agreement?.adminSignedAt && distribution.agreement?.adminNotes) {
    // Try to extract admin name from notes
    const usernameMatch = distribution.agreement.adminNotes.match(/^\[([^\]]+)\]/);
    if (usernameMatch && usernameMatch[1]) {
      adminName = usernameMatch[1];
      // Remove the [username] prefix from notes
      formattedAdminNotes = distribution.agreement.adminNotes.replace(/^\[[^\]]+\]\s*/, '').trim();
      if (!formattedAdminNotes) formattedAdminNotes = undefined;
    } else {
      // Try to extract from "Signed by username" format
      const signedByMatch = distribution.agreement.adminNotes.match(/^Signed by (.+)$/);
      if (signedByMatch && signedByMatch[1]) {
        adminName = signedByMatch[1];
        formattedAdminNotes = undefined; // No actual notes in this case
      }
    }
    
    // If we couldn't extract from notes, try to get from database
    if (adminName === 'Admin') {
      try {
        const admin = await prisma.admin.findFirst({
          select: {
            username: true,
          },
        });
        if (admin) {
          // Decrypt admin username
          try {
            adminName = decrypt(admin.username);
          } catch {
            // Fallback for backward compatibility
            adminName = admin.username;
          }
        }
      } catch (error) {
        console.error('Error fetching admin info:', error);
      }
    }
  }

  console.log('Distribution found:', {
    id: distribution.id,
    assetName: distribution.asset.name,
    type: distribution.type,
    signatureCount: distribution.agreement?.signatures.length || 0,
    adminSigned: !!distribution.agreement?.adminSignedAt,
    adminName
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
      },
      relatedToUser: {
        select: {
          id: true,
          fullName: true,
          ic: true,
          phone: true,
          email: true,
        }
      }
    }
  });

  console.log('Family members found:', familyMembers.length);

  // Verify that the requesting email has access to this distribution
  const assetOwnerEmail = decrypt(distribution.asset.user.email || '');
  const familyEmails = familyMembers.map(fm => {
    try {
      // For registered family members, check their User email
      if (fm.isRegistered && fm.relatedToUser) {
        return decrypt(fm.relatedToUser.email);
      }
      // For non-registered family members, check the family record email
      return fm.user?.email ? decrypt(fm.user.email) : '';
    } catch (error) {
      console.error('Error decrypting family member email:', error);
      return fm.user?.email || '';
    }
  }).filter(email => email);

  // Check if the agreement is signed by admin (completed)
  const isAgreementCompleted = !!distribution.agreement?.adminSignedAt;
  
  // Only allow access if:
  // 1. The agreement is completed (admin has signed), AND
  // 2. The user email is either the asset owner or a family member with access
  const hasAccess = isAgreementCompleted && 
    (assetOwnerEmail === userEmail || familyEmails.includes(userEmail));

  if (!hasAccess) {
    console.log('Access denied for email:', userEmail);
    return { 
      distribution: distribution as Distribution,
      agreementsWithDetails: [],
      adminName,
      adminNotes: formattedAdminNotes,
      error: 'Unauthorized or agreement not completed', 
      status: 403 
    };
  }

  // Map family members to signatures
  const agreementsWithDetails: AgreementDetails[] = distribution.agreement?.signatures.map(signature => {
    const familyMember = familyMembers.find(fm => fm.id === signature.familyId);
    console.log('Processing signature:', {
      signatureId: signature.id,
      familyMemberId: signature.familyId,
      familyMemberFound: !!familyMember
    });
    
    let decryptedFamilyMember = undefined;
    if (familyMember) {
      try {
        let fullName, ic, phone, email;
        
        // If this family member is registered, use their current User data
        if (familyMember.isRegistered && familyMember.relatedToUser) {
          try {
            fullName = decrypt(familyMember.relatedToUser.fullName);
            ic = decrypt(familyMember.relatedToUser.ic);
            phone = decrypt(familyMember.relatedToUser.phone);
            email = decrypt(familyMember.relatedToUser.email);
          } catch (error) {
            console.error('Error decrypting related user data:', error);
            // Fallback to family record data
            fullName = decrypt(familyMember.fullName);
            ic = decrypt(familyMember.ic);
            phone = decrypt(familyMember.phone);
            email = familyMember.user?.email ? decrypt(familyMember.user.email) : undefined;
          }
        } else {
          // For non-registered family members, use the family record data
          fullName = decrypt(familyMember.fullName);
          ic = decrypt(familyMember.ic);
          phone = decrypt(familyMember.phone);
          email = familyMember.user?.email ? decrypt(familyMember.user.email) : undefined;
        }
        
        decryptedFamilyMember = {
          id: familyMember.id,
          fullName,
          relationship: familyMember.relationship,
          ic,
          email,
          phone,
        };
      } catch (error) {
        console.error('Error decrypting family member data:', error);
        // Fallback to original data if decryption fails
        decryptedFamilyMember = {
          id: familyMember.id,
          fullName: familyMember.fullName,
          relationship: familyMember.relationship,
          ic: familyMember.ic,
          email: familyMember.user?.email,
          phone: familyMember.phone || undefined,
        };
      }
    }
    
    return {
      id: signature.id,
      status: signature.status,
      signedAt: signature.signedAt?.toISOString(),
      notes: signature.notes || undefined,
      transactionHash: signature.transactionHash || undefined,
      familyMember: decryptedFamilyMember
    };
  }) || [];

  console.log('Processed agreements:', agreementsWithDetails.length);

  return {
    distribution: distribution as Distribution,
    agreementsWithDetails,
    adminName,
    adminNotes: formattedAdminNotes
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token;
    
    // Verify the secure token
    const tokenData = verifySecurePDFToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    const { distributionId, email } = tokenData;
    
    const data = await getDistributionDataSecure(distributionId, email);
    
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

    const { distribution, agreementsWithDetails, adminName, adminNotes } = data;

    if (!distribution || !distribution.asset || !distribution.agreement) {
      return NextResponse.json(
        { error: 'Invalid distribution data' },
        { status: 500 }
      );
    }

    console.log('Creating PDF document...');
    try {
      // Decrypt benefactor data for PDF generation
      let decryptedBenefactorName = distribution.asset.user.fullName;
      let decryptedBenefactorIC = distribution.asset.user.ic;
      try {
        decryptedBenefactorName = decrypt(distribution.asset.user.fullName);
        decryptedBenefactorIC = decrypt(distribution.asset.user.ic);
      } catch (error) {
        console.error('Error decrypting benefactor data for PDF:', error);
        // Use original data if decryption fails
      }

      // Create the PDF document with proper Document wrapper
      const pdfInstance = pdf(
        createElement(Document, {},
          createElement(AgreementPDF, {
            assetName: distribution.asset.name,
            distributionType: distribution.type,
            agreements: agreementsWithDetails,
            createdAt: distribution.createdAt.toISOString(),
            benefactorName: decryptedBenefactorName,
            benefactorIC: decryptedBenefactorIC,
            assetValue: distribution.asset.value,
            assetDescription: distribution.asset.description,
            agreementId: distribution.agreement?.id,
            adminSignedAt: distribution.agreement?.adminSignedAt ? distribution.agreement.adminSignedAt.toISOString() : undefined,
            adminNotes: adminNotes,
            adminName: adminName,
            beneficiaries: distribution.beneficiaries as Array<{familyId: string; percentage: number}> | undefined,
            organization: distribution.organization as string | undefined,
            distributionNotes: distribution.notes as string | undefined,
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
          'Content-Disposition': `inline; filename="agreement-${distributionId}.pdf"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
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
    console.error('Error in secure agreement PDF route:', error);
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