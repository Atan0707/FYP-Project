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
        agreements: {
          every: {
            status: 'pending_admin',
          },
        },
      },
      include: {
        asset: true,
        agreements: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // For each distribution, we'll only return one agreement (the first one)
    // but keep all the agreements data in the distribution for progress tracking
    const pendingAdminAgreements = distributions.map(distribution => {
      const firstAgreement = distribution.agreements[0];
      return {
        ...firstAgreement,
        distribution: {
          ...distribution,
          agreements: distribution.agreements,
        },
      };
    });

    return NextResponse.json(pendingAdminAgreements);
  } catch (error) {
    console.error('Error fetching pending admin agreements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 