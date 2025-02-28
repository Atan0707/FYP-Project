import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = (await params).id;
    const { action } = await request.json();

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get the pending asset
    const pendingAsset = await prisma.pendingAsset.findUnique({
      where: { id },
    });

    if (!pendingAsset) {
      return NextResponse.json(
        { error: 'Pending asset not found' },
        { status: 404 }
      );
    }

    // If approved, create a new asset and delete the pending asset
    if (action === 'approve') {
      // Create the new asset
      await prisma.asset.create({
        data: {
          name: pendingAsset.name,
          type: pendingAsset.type,
          value: pendingAsset.value,
          description: pendingAsset.description,
          pdfFile: pendingAsset.pdfFile,
          userId: pendingAsset.userId,
        },
      });

      // Delete the pending asset
      await prisma.pendingAsset.delete({
        where: { id },
      });
    } else {
      // If rejected, just update the status
      await prisma.pendingAsset.update({
        where: { id },
        data: { status: 'rejected' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Asset ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error(`Error ${request.method} pending asset:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 