import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/services/encryption';

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

    // Get all users and decrypt their ICs to find a match
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        ic: true,
        phone: true,
        email: true,
      },
    });

    let foundUser = null;
    for (const user of users) {
      try {
        const decryptedIC = decrypt(user.ic);
        if (decryptedIC === ic) {
          foundUser = user;
          break;
        }
      } catch {
        // Try unencrypted IC for backward compatibility
        if (user.ic === ic) {
          foundUser = user;
          break;
        }
      }
    }

    if (!foundUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Decrypt user data before returning
    let decryptedFullName = foundUser.fullName;
    let decryptedIC = foundUser.ic;
    let decryptedPhone = foundUser.phone;
    let decryptedEmail = foundUser.email;

    try {
      decryptedFullName = decrypt(foundUser.fullName);
    } catch (error) {
      console.error('Error decrypting fullName:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    try {
      decryptedIC = decrypt(foundUser.ic);
    } catch (error) {
      console.error('Error decrypting IC:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    try {
      decryptedPhone = decrypt(foundUser.phone);
    } catch (error) {
      console.error('Error decrypting phone:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    try {
      decryptedEmail = decrypt(foundUser.email);
    } catch (error) {
      console.error('Error decrypting email:', error);
      // Use as-is if decryption fails (for backward compatibility)
    }

    return NextResponse.json({
      id: foundUser.id,
      fullName: decryptedFullName,
      ic: decryptedIC,
      phone: decryptedPhone,
      email: decryptedEmail,
    });
  } catch (error) {
    console.error('Error searching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 