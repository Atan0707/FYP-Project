import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { ic } = await request.json();

    if (!ic) {
      return NextResponse.json({ error: 'IC number is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { ic },
      select: {
        id: true,
        fullName: true,
        ic: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error searching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 