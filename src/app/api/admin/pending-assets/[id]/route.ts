import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('adminId')?.value;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
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

    // Update the pending asset status
    await prisma.pendingAsset.update({
      where: { id },
      data: { status: action === 'approve' ? 'approved' : 'rejected' },
    });

    // If approved, create a new asset
    if (action === 'approve') {
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