import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET pending admin agreements
export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all asset distributions where all agreements are in pending_admin status
    const distributions = await prisma.assetDistribution.findMany({
      where: {
        status: 'pending_admin',
        agreement: {
          status: 'pending_admin',
        },
      },
      include: {
        asset: true,
        agreement: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to match the expected interface
    const pendingAdminAgreements = distributions.map(distribution => {
      if (!distribution.agreement) return null;
      
      // Create a structure that matches the expected interface
      // where distribution has an agreements array property
      const distributionWithAgreements = {
        ...distribution,
        agreements: [distribution.agreement],
      };
      
      // Remove the singular agreement property
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { agreement: _, ...distributionWithoutAgreement } = distributionWithAgreements;
      
      return {
        ...distribution.agreement,
        distribution: distributionWithoutAgreement,
      };
    }).filter(Boolean);

    return NextResponse.json(pendingAdminAgreements);
  } catch (error) {
    console.error('Error fetching pending admin agreements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 