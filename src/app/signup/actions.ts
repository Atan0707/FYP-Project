'use server';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getInverseRelationship } from '@/lib/relationships';

const prisma = new PrismaClient();

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const ic = formData.get('ic') as string;
  const phone = formData.get('phone') as string;

  if (!email || !password || !fullName || !ic || !phone) {
    return { error: 'All fields are required' };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { ic }
        ]
      }
    });

    if (existingUser) {
      return { error: 'User already exists with this email or IC' };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        ic,
        phone,
      },
    });

    // Update any existing family members with this IC
    try {
      // Find all family entries with this IC that are not registered
      const familyEntries = await prisma.family.findMany({
        where: {
          ic: ic,
          isRegistered: false,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              ic: true,
              phone: true,
            }
          }
        }
      });

      if (familyEntries.length > 0) {
        // Update each family entry and create reciprocal relationships
        for (const family of familyEntries) {
          // Update the family entry to mark as registered and link to the user
          await prisma.family.update({
            where: { id: family.id },
            data: {
              isRegistered: true,
              relatedUserId: newUser.id,
              inverseRelationship: getInverseRelationship(family.relationship),
            }
          });

          // Create a reciprocal relationship if it doesn't exist
          const existingReciprocal = await prisma.family.findFirst({
            where: {
              ic: family.user.ic,
              userId: newUser.id
            }
          });

          if (!existingReciprocal) {
            await prisma.family.create({
              data: {
                fullName: family.user.fullName,
                ic: family.user.ic,
                phone: family.user.phone,
                relationship: getInverseRelationship(family.relationship),
                occupation: '',
                income: 0,
                isRegistered: true,
                userId: newUser.id,
                relatedUserId: family.user.id,
                inverseRelationship: family.relationship,
              }
            });
          } else {
            // Update the existing reciprocal relationship
            await prisma.family.update({
              where: { id: existingReciprocal.id },
              data: {
                relationship: getInverseRelationship(family.relationship),
                inverseRelationship: family.relationship,
                relatedUserId: family.user.id,
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating family relationships:', error);
      // Continue with signup even if this fails
    }

    return { success: true };
  } catch (error) {
    console.error('Error during signup:', error);
    return { error: 'Something went wrong during signup' };
  }
}
