import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET pending agreements for the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all pending agreements where the user is a family member
    const agreements = await prisma.agreement.findMany({
      where: {
        status: 'pending',
        familyId: {
          in: (await prisma.family.findMany({
            where: { userId },
            select: { id: true },
          })).map(f => f.id),
        },
      },
      include: {
        distribution: {
          include: {
            asset: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(agreements);
  } catch (error) {
    console.error('Error fetching pending agreements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 