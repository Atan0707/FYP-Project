import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET all agreements for admin
export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all asset distributions with their agreements
    const distributions = await prisma.assetDistribution.findMany({
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

    // For each distribution, return only one agreement but keep all agreements data
    const allAgreements = distributions.map(distribution => {
      const firstAgreement = distribution.agreements[0];
      return {
        ...firstAgreement,
        distribution: {
          ...distribution,
          agreements: distribution.agreements,
        },
      };
    });

    return NextResponse.json(allAgreements);
  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 