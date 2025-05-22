import { Storage } from '@google-cloud/storage';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: path.join(process.cwd(), 'hariz-fyp.json'),
  projectId: 'exalted-summer-448722-c5',
});

const bucketName = 'fyp-user-profiles'; // Bucket for user profile images
const assetsBucketName = 'fyp-asset-documents'; // New bucket for asset documents

export async function uploadProfileImage(base64Image: string, userId: string): Promise<string> {
  // Extract the mimetype and base64 data
  const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid image format');
  }
  
  const [, mimeType, base64Data] = matches;
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Generate a unique filename for the image
  const fileExtension = mimeType.split('/')[1] || 'jpg';
  const fileName = `${userId}_${uuidv4()}.${fileExtension}`;
  
  // Check if bucket exists and create it if it doesn't
  const [bucketExists] = await storage.bucket(bucketName).exists();
  
  if (!bucketExists) {
    try {
      console.log(`Creating bucket ${bucketName}...`);
      await storage.createBucket(bucketName, {
        location: 'us-central1',
        storageClass: 'STANDARD',
      });
      console.log(`Bucket ${bucketName} created successfully.`);
      
      // Make the bucket public
      await storage.bucket(bucketName).makePublic();
      console.log(`Made bucket ${bucketName} publicly readable.`);
    } catch (error) {
      console.error('Error creating bucket:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('Bucket already exists, continuing...');
      } else {
        throw error;
      }
    }
  }
  
  // Upload the image to Google Cloud Storage
  const file = storage.bucket(bucketName).file(fileName);
  
  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
    },
  });
  
  // Make the file publicly accessible
  await file.makePublic();
  
  // Return the public URL
  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

export async function deleteProfileImage(imageUrl: string): Promise<void> {
  // Skip deletion for default images
  if (!imageUrl || 
      imageUrl.includes('/images/default-avatar.jpg') || 
      imageUrl.includes('/avatars/default.jpg') ||
      !imageUrl.includes(`storage.googleapis.com/${bucketName}/`)) {
    return; // Default image or not from our storage
  }
  
  // Extract filename from URL
  const fileName = imageUrl.split('/').pop();
  
  if (!fileName) {
    throw new Error('Invalid image URL');
  }
  
  try {
    // Delete the file
    await storage.bucket(bucketName).file(fileName).delete();
  } catch (error) {
    console.error('Error deleting file from Cloud Storage:', error);
    // Continue even if deletion fails
  }
}

export async function uploadAssetDocument(base64File: string, userId: string, assetName: string) {
  try {
    // Check if assets bucket exists and create it if it doesn't
    const [bucketExists] = await storage.bucket(assetsBucketName).exists();
    
    if (!bucketExists) {
      try {
        console.log(`Creating bucket ${assetsBucketName}...`);
        await storage.createBucket(assetsBucketName, {
          location: 'us-central1',
          storageClass: 'STANDARD',
        });
        console.log(`Bucket ${assetsBucketName} created successfully.`);
        
        // Make the bucket public
        await storage.bucket(assetsBucketName).makePublic();
        console.log(`Made bucket ${assetsBucketName} publicly readable.`);
      } catch (error) {
        console.error('Error creating bucket:', error);
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log('Bucket already exists, continuing...');
        } else {
          throw error;
        }
      }
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(base64File.split(',')[1], 'base64');
    
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `${userId}/${assetName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
    
    const file = storage.bucket(assetsBucketName).file(filename);
    
    // Upload the file
    await file.save(fileBuffer, {
      metadata: {
        contentType: 'application/pdf',
      },
    });
    
    // Make the file publicly accessible
    await file.makePublic();
    
    // Return the public URL
    return `https://storage.googleapis.com/${assetsBucketName}/${filename}`;
  } catch (error) {
    console.error('Error uploading to Google Cloud Storage:', error);
    throw new Error('Failed to upload file to storage');
  }
}

export async function deleteAssetDocument(fileUrl: string) {
  try {
    if (!fileUrl.includes(`storage.googleapis.com/${assetsBucketName}/`)) {
      throw new Error('Invalid file URL: Not from assets bucket');
    }

    // Extract filename from URL
    const urlParts = fileUrl.split(`${assetsBucketName}/`);
    if (urlParts.length !== 2) throw new Error('Invalid file URL format');
    
    const filename = urlParts[1];
    
    // Delete the file
    await storage.bucket(assetsBucketName).file(filename).delete();
    
  } catch (error) {
    console.error('Error deleting from Google Cloud Storage:', error);
    throw new Error('Failed to delete file from storage');
  }
} 