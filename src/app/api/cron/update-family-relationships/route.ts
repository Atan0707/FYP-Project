import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getInverseRelationship } from '@/lib/relationships';

// This endpoint is meant to be called by a cron job to periodically update family relationships
// It will find all unregistered family members whose IC matches a registered user and update them

export async function GET() {
  try {
    // Find all unregistered family members
    const unregisteredFamilies = await prisma.family.findMany({
      where: {
        isRegistered: false,
      },
    });

    if (unregisteredFamilies.length === 0) {
      return NextResponse.json({ message: 'No unregistered family members found', updated: 0 });
    }

    let updatedCount = 0;

    // For each unregistered family member, check if there's a registered user with the same IC
    for (const family of unregisteredFamilies) {
      const registeredUser = await prisma.user.findUnique({
        where: { ic: family.ic },
        select: {
          id: true,
          fullName: true,
          ic: true,
          phone: true,
        }
      });

      if (registeredUser) {
        // Get the user who added this family member
        const currentUser = await prisma.user.findUnique({
          where: { id: family.userId },
          select: {
            id: true,
            fullName: true,
            ic: true,
            phone: true,
          }
        });

        if (currentUser) {
          // Update the family member to mark as registered and link to the user
          await prisma.family.update({
            where: { id: family.id },
            data: {
              isRegistered: true,
              relatedUserId: registeredUser.id,
              inverseRelationship: getInverseRelationship(family.relationship),
            }
          });

          // Check if the reciprocal relationship exists
          const existingReciprocal = await prisma.family.findFirst({
            where: {
              ic: currentUser.ic,
              userId: registeredUser.id
            }
          });

          if (!existingReciprocal) {
            // Create the reciprocal relationship
            await prisma.family.create({
              data: {
                fullName: currentUser.fullName,
                ic: currentUser.ic,
                phone: currentUser.phone,
                relationship: getInverseRelationship(family.relationship),
                occupation: '',
                income: 0,
                isRegistered: true,
                userId: registeredUser.id,
                relatedUserId: currentUser.id,
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
                relatedUserId: currentUser.id,
              }
            });
          }

          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      message: `Updated ${updatedCount} family relationships`,
      updated: updatedCount
    });
  } catch (error) {
    console.error('Error updating family relationships:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 