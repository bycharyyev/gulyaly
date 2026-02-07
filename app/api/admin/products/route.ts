import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/security';

// GET /api/admin/products - List products for moderation
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    
    // Verify admin role
    if (user.role !== 'ADMIN') {
      logSecurityEvent('access_denied', { action: 'admin_list_products', userId: user.id, reason: 'not_admin' });
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING_APPROVAL';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status !== 'ALL') {
      where.status = status;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        variants: true,
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.product.count({ where });

    // Get stats
    const stats = {
      pending: await prisma.product.count({ where: { status: 'PENDING_APPROVAL' } }),
      active: await prisma.product.count({ where: { status: 'ACTIVE' } }),
      rejected: await prisma.product.count({ where: { status: 'REJECTED' } }),
      total: await prisma.product.count()
    };

    return NextResponse.json({
      products,
      stats,
      pagination: {
        total: totalCount,
        limit,
        offset
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Admin list products error:', error);
    logSecurityEvent('api_error', {
      action: 'admin_list_products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Failed to load products' },
      { status: 500 }
    );
  }
}
