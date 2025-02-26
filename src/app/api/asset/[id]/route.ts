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

    const asset = await prisma.asset.delete({
      where: {
        id: params.id,
        userId: userId,
      },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error deleting asset:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 