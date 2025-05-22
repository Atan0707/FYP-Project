import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import path from 'path';

// Function to decode the Google Cloud Storage URL
const decodeGoogleStorageUrl = (url: string) => {
  try {
    // Remove the base URL if it exists
    const baseUrl = 'https://storage.googleapis.com/';
    const path = url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url;
    
    // Split into bucket and object path
    const [bucket, ...objectParts] = path.split('/');
    const object = objectParts.join('/');
    
    return { bucket, object };
  } catch (error) {
    console.error('Error decoding Google Storage URL:', error);
    return null;
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const filename = (await params).filename;
  try {
    // Initialize Google Cloud Storage
    const storage = new Storage({
      keyFilename: path.join(process.cwd(), 'hariz-fyp.json'),
      projectId: 'exalted-summer-448722-c5',
    });

    // Decode the filename from the URL parameter
    const decodedFilename = decodeURIComponent(filename);
    
    // Get bucket and object path
    const bucketInfo = decodeGoogleStorageUrl(decodedFilename);
    if (!bucketInfo) {
      throw new Error('Invalid storage URL');
    }

    const bucket = storage.bucket(bucketInfo.bucket);
    const file = bucket.file(bucketInfo.object);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error('File not found in bucket');
    }

    // Get file content
    const [fileContent] = await file.download();

    // Create response with appropriate headers
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${path.basename(bucketInfo.object)}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'File not found or inaccessible' },
      { status: 404 }
    );
  }
} 