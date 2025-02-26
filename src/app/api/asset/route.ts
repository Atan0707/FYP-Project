import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const assets = await prisma.asset.findMany({
      where: {
        userId: userId,
      },
      include: {
        distribution: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
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
    
    const asset = await prisma.asset.create({
      data: {
        name: body.name,
        type: body.type,
        value: body.value,
        description: body.description,
        pdfFile: body.pdfFile,
        userId: userId,
      },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
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

    const asset = await prisma.asset.update({
      where: {
        id,
        userId: userId,
      },
      data,
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 