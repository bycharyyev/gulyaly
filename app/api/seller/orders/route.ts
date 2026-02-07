import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/security';

// GET /api/seller/orders - Get all orders for seller's products
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const user = session.user as any;
    const sellerId = user.id;

    // Verify seller role
    if (user.role !== 'SELLER') {
      logSecurityEvent('access_denied', { action: 'seller_get_orders', sellerId, reason: 'not_seller' });
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    if (user.sellerStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Продавец не одобрен' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause - only orders for seller's products
    const where: any = {
      product: {
        store: {
          ownerId: sellerId
        }
      }
    };

    if (status) {
      where.status = status;
    }

    // Get orders with related data
    const orders = await prisma.order.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            store: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        transaction: {
          select: {
            id: true,
            totalAmount: true,
            platformFee: true,
            sellerAmount: true,
            status: true
          }
        },
        dispute: {
          select: {
            id: true,
            status: true,
            reason: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Get total count
    const totalCount = await prisma.order.count({ where });

    // Get summary stats
    const stats = {
      total: totalCount,
      pending: await prisma.order.count({
        where: {
          ...where,
          status: 'PENDING'
        }
      }),
      paid: await prisma.order.count({
        where: {
          ...where,
          status: 'PAID'
        }
      }),
      completed: await prisma.order.count({
        where: {
          ...where,
          status: 'COMPLETED'
        }
      }),
      disputed: await prisma.order.count({
        where: {
          ...where,
          status: 'DISPUTED'
        }
      })
    };

    return NextResponse.json({
      orders,
      stats,
      pagination: {
        total: totalCount,
        limit,
        offset
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Get seller orders error:', error);
    logSecurityEvent('api_error', {
      action: 'seller_get_orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Ошибка получения заказов' },
      { status: 500 }
    );
  }
}
