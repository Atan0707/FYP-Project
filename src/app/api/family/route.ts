import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getInverseRelationship } from '@/lib/relationships';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const families = await prisma.family.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(families);
  } catch (error) {
    console.error('Error fetching families:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.fullName || !body.ic || !body.relationship || !body.phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if a family member with this IC already exists for the current user
    const existingFamily = await prisma.family.findFirst({
      where: { 
        ic: body.ic,
        userId: userId
      },
    });

    if (existingFamily) {
      return NextResponse.json(
        { error: 'Family member with this IC already exists' },
        { status: 400 }
      );
    }

    // Check if the IC belongs to a registered user
    const registeredUser = await prisma.user.findUnique({
      where: { ic: body.ic },
    });

    // Create the family member entry
    const family = await prisma.family.create({
      data: {
        ...body,
        isRegistered: !!registeredUser,
        userId: userId,
        // If the person is registered, set up the bidirectional relationship
        ...(registeredUser && {
          relatedUserId: registeredUser.id,
          inverseRelationship: getInverseRelationship(body.relationship),
        }),
      },
    });

    // If the person is registered, create the reciprocal relationship
    if (registeredUser) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, ic: true, phone: true },
      });

      if (currentUser) {
        // Check if the current user is already a family member of the registered user
        const existingReciprocal = await prisma.family.findFirst({
          where: {
            ic: currentUser.ic,
            userId: registeredUser.id
          }
        });

        // Only create the reciprocal relationship if it doesn't exist
        if (!existingReciprocal) {
          await prisma.family.create({
            data: {
              fullName: currentUser.fullName,
              ic: currentUser.ic,
              phone: currentUser.phone,
              relationship: getInverseRelationship(body.relationship),
              occupation: body.occupation || '',
              income: 0,
              isRegistered: true,
              userId: registeredUser.id,
              relatedUserId: userId,
              inverseRelationship: body.relationship,
            },
          });
        } else {
          // Update the existing reciprocal relationship
          await prisma.family.update({
            where: { id: existingReciprocal.id },
            data: {
              relationship: getInverseRelationship(body.relationship),
              inverseRelationship: body.relationship,
              relatedUserId: userId,
            }
          });
        }
      }
    }

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error creating family:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    // Check if the IC belongs to a registered user
    const registeredUser = await prisma.user.findUnique({
      where: { ic: data.ic },
    });

    // Get the existing family record
    const existingFamily = await prisma.family.findUnique({
      where: { id },
      include: { relatedToUser: true },
    });

    if (!existingFamily) {
      return new NextResponse('Family member not found', { status: 404 });
    }

    // If IC has changed, check if the new IC already exists for this user
    if (existingFamily.ic !== data.ic) {
      const duplicateIC = await prisma.family.findFirst({
        where: {
          ic: data.ic,
          userId: userId,
          id: { not: id } // Exclude the current record
        }
      });

      if (duplicateIC) {
        return NextResponse.json(
          { error: 'Another family member with this IC already exists' },
          { status: 400 }
        );
      }
    }

    // Update the family member entry
    const family = await prisma.family.update({
      where: {
        id,
        userId: userId,
      },
      data: {
        ...data,
        isRegistered: !!registeredUser,
        // If the person is registered, update the bidirectional relationship
        ...(registeredUser && {
          relatedUserId: registeredUser.id,
          inverseRelationship: getInverseRelationship(data.relationship),
        }),
      },
    });

    // If there's a related user, update their reciprocal relationship
    if (registeredUser) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, ic: true, phone: true },
      });

      if (currentUser) {
        // Find the reciprocal relationship
        const reciprocalRelationship = await prisma.family.findFirst({
          where: {
            userId: registeredUser.id,
            relatedUserId: userId,
          },
        });

        if (reciprocalRelationship) {
          // Update the existing reciprocal relationship
          await prisma.family.update({
            where: { id: reciprocalRelationship.id },
            data: {
              relationship: getInverseRelationship(data.relationship),
              inverseRelationship: data.relationship,
            },
          });
        } else {
          // Create a new reciprocal relationship if it doesn't exist
          const existingReciprocal = await prisma.family.findFirst({
            where: {
              ic: currentUser.ic,
              userId: registeredUser.id
            }
          });

          if (!existingReciprocal) {
            await prisma.family.create({
              data: {
                fullName: currentUser.fullName,
                ic: currentUser.ic,
                phone: currentUser.phone,
                relationship: getInverseRelationship(data.relationship),
                occupation: '',
                income: 0,
                isRegistered: true,
                userId: registeredUser.id,
                relatedUserId: userId,
                inverseRelationship: data.relationship,
              },
            });
          } else {
            // Update the existing record
            await prisma.family.update({
              where: { id: existingReciprocal.id },
              data: {
                relationship: getInverseRelationship(data.relationship),
                inverseRelationship: data.relationship,
                relatedUserId: userId,
              }
            });
          }
        }
      }
    }

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error updating family:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 