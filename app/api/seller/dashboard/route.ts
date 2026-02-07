import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'seller_dashboard', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const user = session.user as any;
    const sellerId = user.id;

    // ❗ Проверка: role == SELLER
    if (user.role !== 'SELLER') {
      logSecurityEvent('access_denied', { action: 'seller_dashboard', sellerId, reason: 'not_seller' });
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    // ❗ Проверка: sellerStatus == APPROVED
    if (user.sellerStatus !== 'APPROVED') {
      return NextResponse.json({
        error: 'Ваша заявка еще не одобрена',
        sellerStatus: user.sellerStatus
      }, { status: 403 });
    }

    // ❗ Проверка: banned == false (from Seller table, not User)
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { banned: true, bannedReason: true, sellerStatus: true, name: true, email: true, businessName: true }
    });

    if (!seller) {
      logSecurityEvent('access_denied', { action: 'seller_dashboard', sellerId, reason: 'seller_not_found' });
      return NextResponse.json({ error: 'Продавец не найден' }, { status: 404 });
    }

    if (seller.banned) {
      return NextResponse.json({
        error: 'Ваш аккаунт заблокирован',
        reason: seller.bannedReason
      }, { status: 403 });
    }

    // ❗ Мои магазины
    const stores = await prisma.store.findMany({
      where: { ownerId: sellerId },
      include: {
        products: {
          select: { id: true }
        }
      }
    });

    // ❗ Мои товары (count)
    const productsCount = await prisma.product.count({
      where: {
        store: {
          ownerId: sellerId
        }
      }
    });

    // ❗ Мои заказы (через products моих stores)
    const orders = await prisma.order.findMany({
      where: {
        product: {
          store: {
            ownerId: sellerId
          }
        }
      },
      include: {
        product: true,
        variant: true,
        transaction: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // ❗ Disputes count
    const disputesCount = await prisma.dispute.count({
      where: {
        order: {
          product: {
            store: {
              ownerId: sellerId
            }
          }
        },
        status: 'OPEN'
      }
    });

    // ❗ Баланс (pending payouts)
    const transactions = await prisma.transaction.findMany({
      where: {
        sellerId: sellerId,
        status: 'COMPLETED'
      }
    });

    const balance = transactions.reduce((sum, t) => sum + t.sellerAmount, 0);

    // ❗ Статистика
    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'PENDING').length,
      completedOrders: orders.filter(o => o.status === 'COMPLETED').length,
      totalRevenue: transactions.reduce((sum, t) => sum + t.sellerAmount, 0)
    };

    return NextResponse.json({
      seller: {
        id: sellerId,
        name: seller.name,
        email: seller.email,
        businessName: seller.businessName,
        sellerStatus: seller.sellerStatus
      },
      stores: stores.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        isActive: s.isActive,
        productsCount: s.products.length
      })),
      productsCount,
      ordersCount: orders.length,
      disputesCount,
      balance,
      stats,
      recentOrders: orders.slice(0, 5).map(o => ({
        id: o.id,
        amount: o.amount,
        status: o.status,
        productName: o.product.name,
        createdAt: o.createdAt,
        paidAt: o.paidAt
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('Seller dashboard error:', error);
    logSecurityEvent('api_error', { 
      action: 'seller_dashboard', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка загрузки данных' },
      { status: 500 }
    );
  }
}
