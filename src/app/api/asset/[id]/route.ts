import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const asset = await prisma.asset.delete({
      where: {
        id: id,
        userId: userId,
      },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error deleting asset:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: id,
        userId: userId,
      },
      include: {
        distribution: {
          include: {
            agreements: true
          }
        }
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // If there are agreements, fetch family member details
    if (asset.distribution?.agreements) {
      const familyMembers = await prisma.family.findMany({
        where: {
          id: {
            in: asset.distribution.agreements.map(a => a.familyId)
          }
        },
        select: {
          id: true,
          fullName: true,
          relationship: true
        }
      });

      // Attach family member details to agreements
      asset.distribution.agreements = asset.distribution.agreements.map(agreement => ({
        ...agreement,
        familyMember: familyMembers.find(f => f.id === agreement.familyId)
      }));
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 