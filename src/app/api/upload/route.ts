import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const uniqueId = uuidv4();
    const fileName = `${uniqueId}-${file.name}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Initialize Google Cloud Storage
    // Instead of using a keyFilename that requires a physical file,
    // use credentials directly for serverless environments
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
    });
    
    const bucketName = 'fyp-project-hariz';
    const bucket = storage.bucket(bucketName);
    const fileObject = bucket.file(fileName);
    
    // Upload buffer to Google Cloud Storage
    await fileObject.save(buffer, {
      contentType: file.type,
      metadata: {
        uploadedBy: userId,
        originalName: file.name
      }
    });
    
    // Get the file URL (note: this might require authentication to access if bucket is not public)
    const fileUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    
    return NextResponse.json({ filePath: fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 