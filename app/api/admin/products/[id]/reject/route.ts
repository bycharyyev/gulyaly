import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/security';

// PATCH /api/admin/products/[id]/reject - Reject a product
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    
    // Verify admin role
    if (user.role !== 'ADMIN') {
      logSecurityEvent('access_denied', { action: 'admin_reject_product', userId: user.id, reason: 'not_admin' });
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const productId = params.id;
    const { reason } = await request.json();

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({ error: 'Rejection reason is required (min 10 characters)' }, { status: 400 });
    }

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          select: {
            name: true,
            owner: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: 'Product is not pending approval' }, { status: 400 });
    }

    // Reject product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'REJECTED',
        isActive: false,
        rejectionReason: reason
      }
    });

    logSecurityEvent('api_error', {
      action: 'admin_reject_product',
      adminId: user.id,
      productId,
      sellerId: product.store?.owner?.id,
      reason
    });

    return NextResponse.json({
      success: true,
      message: 'Product rejected',
      product: updatedProduct
    }, { status: 200 });

  } catch (error) {
    console.error('Admin reject product error:', error);
    logSecurityEvent('api_error', {
      action: 'admin_reject_product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Failed to reject product' },
      { status: 500 }
    );
  }
}
