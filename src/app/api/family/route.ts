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

    const families = await prisma.family.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(families);
  } catch (error) {
    console.error('Error fetching families:', error);
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

    // Check if a family member with this IC already exists
    const existingFamily = await prisma.family.findUnique({
      where: { ic: body.ic },
    });

    if (existingFamily) {
      return NextResponse.json(
        { error: 'Family member with this IC already exists' },
        { status: 400 }
      );
    }

    // Check if the IC belongs to a registered user
    const registeredUser = await prisma.user.findUnique({
      where: { ic: body.ic },
    });

    const family = await prisma.family.create({
      data: {
        ...body,
        isRegistered: !!registeredUser, // Set isRegistered based on whether user exists
        userId: userId,
      },
    });

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error creating family:', error);
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

    // Check if the IC belongs to a registered user
    const registeredUser = await prisma.user.findUnique({
      where: { ic: data.ic },
    });

    const family = await prisma.family.update({
      where: {
        id,
        userId: userId,
      },
      data: {
        ...data,
        isRegistered: !!registeredUser, // Update isRegistered status
      },
    });

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error updating family:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 