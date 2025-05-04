import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth0 } from "@/lib/auth0"

export async function GET() {
  try {
    // Get session using Auth0
    const session = await auth0.getSession()
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { user } = session
    
    // Format the user data for the frontend
    const userData = {
      name: user.name || user.nickname || 'User',
      email: user.email || '',
      avatar: user.picture || '',
      // You can add more user profile data here
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
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

    // Update all family records where this user is referenced
    await prisma.family.updateMany({
      where: {
        ic: updatedUser.ic,
        userId: { not: userId }, // Only update records created by other users
        isRegistered: true,
      },
      data: {
        fullName,
        phone,
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