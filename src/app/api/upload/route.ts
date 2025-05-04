import { NextRequest, NextResponse } from 'next/server';
import { uploadProfileImage, deleteProfileImage } from '@/lib/googleCloudStorage';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get user ID
    const userId = user.id;
    
    // Parse the request body
    const body = await request.json();
    
    if (!body.image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }
    
    // Get the current user to check if they have an existing profile image
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { photo: true }
    });
    
    // If user has an existing custom profile image, delete it
    if (userProfile?.photo && !userProfile.photo.includes('/avatars/default.jpg')) {
      await deleteProfileImage(userProfile.photo);
    }
    
    // Upload the new image to Google Cloud Storage
    const imageUrl = await uploadProfileImage(body.image, userId);
    
    // Update the user's profile with the new image URL
    await prisma.user.update({
      where: { id: userId },
      data: { photo: imageUrl }
    });
    
    return NextResponse.json({ url: imageUrl });
    
  } catch (error) {
    console.error('Error uploading image:', error);
    
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
} 