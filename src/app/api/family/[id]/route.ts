import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const family = await prisma.family.delete({
      where: {
        id: params.id,
        userId: userId,
      },
    });

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error deleting family:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 