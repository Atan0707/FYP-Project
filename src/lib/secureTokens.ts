import crypto from 'crypto';

// Generate a secure token for PDF access
export function generateSecurePDFToken(distributionId: string, email: string, expiresInHours: number = 72): string {
  try {
    // Set expiration time (default 72 hours from now)
    const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);
    
    // Create signature
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    const dataToSign = `${distributionId}:${email}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
    
    // Create token: distributionId:email:expiresAt:signature
    const tokenData = `${distributionId}:${email}:${expiresAt}:${signature}`;
    
    // Encode as base64url for URL safety
    return Buffer.from(tokenData, 'utf-8').toString('base64url');
  } catch (error) {
    console.error('Error generating secure token:', error);
    throw new Error('Failed to generate secure token');
  }
}

// Verify a secure token (used by the API route)
export function verifySecurePDFToken(token: string): { distributionId: string; email: string; expiresAt: number } | null {
  try {
    // The token format: base64(distributionId:email:expiresAt:signature)
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    
    if (parts.length !== 4) {
      return null;
    }
    
    const [distributionId, email, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr);
    
    // Check if token has expired
    if (Date.now() > expiresAt) {
      return null;
    }
    
    // Verify signature
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    const dataToSign = `${distributionId}:${email}:${expiresAtStr}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    return { distributionId, email, expiresAt };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// Generate secure URL for PDF access
export function generateSecurePDFUrl(distributionId: string, email: string, expiresInHours: number = 72): string {
  const token = generateSecurePDFToken(distributionId, email, expiresInHours);
  return `${process.env.NEXTAUTH_URL}/api/agreement-pdf/secure/${token}`;
} 