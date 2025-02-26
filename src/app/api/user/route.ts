import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the full user data including address and photo
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        ic: true,
        phone: true,
        address: true,
        photo: true,
      },
    })

    if (!fullUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Format the response to match your User type
    return NextResponse.json({
      id: fullUser.id,
      name: fullUser.fullName,
      email: fullUser.email,
      ic: fullUser.ic,
      phone: fullUser.phone,
      address: fullUser.address || '',
      avatar: fullUser.photo || '/avatars/default.jpg'
    })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, phone, address, photo } = body;

    // Validate required fields
    if (!fullName || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        phone,
        address,
        photo,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        ic: true,
        phone: true,
        address: true,
        photo: true,
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.fullName,
      email: updatedUser.email,
      ic: updatedUser.ic,
      phone: updatedUser.phone,
      address: updatedUser.address || '',
      avatar: updatedUser.photo || '/avatars/default.jpg'
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 