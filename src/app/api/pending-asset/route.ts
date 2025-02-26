import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingAssets = await prisma.pendingAsset.findMany({
      where: {
        userId,
        status: {
          in: ['pending', 'rejected']
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(pendingAssets);
  } catch (error) {
    console.error('Error fetching pending assets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    
    const pendingAsset = await prisma.pendingAsset.create({
      data: {
        name: body.name,
        type: body.type,
        value: body.value,
        description: body.description,
        pdfFile: body.pdfFile,
        status: 'pending',
        userId: userId,
      },
    });

    return NextResponse.json(pendingAsset);
  } catch (error) {
    console.error('Error creating pending asset:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    const pendingAsset = await prisma.pendingAsset.update({
      where: {
        id,
        userId: userId,
      },
      data,
    });

    return NextResponse.json(pendingAsset);
  } catch (error) {
    console.error('Error updating pending asset:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 