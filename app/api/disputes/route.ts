import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, logSecurityEvent } from '@/lib/security';

// POST /api/disputes - Create dispute (buyer only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'create_dispute', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Rate limit: 5 disputes per day
    if (!checkRateLimit(`create_dispute:${userId}`, 5, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Слишком много споров за день' },
        { status: 429 }
      );
    }

    const { orderId, reason, description } = await request.json();

    // Validation
    if (!orderId || !reason || !description) {
      return NextResponse.json({ 
        error: 'Укажите заказ, причину и описание' 
      }, { status: 400 });
    }

    if (description.length < 20) {
      return NextResponse.json({ 
        error: 'Описание должно содержать минимум 20 символов' 
      }, { status: 400 });
    }

    // ❗ Только paid/delivered orders
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        dispute: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // ❗ Только buyer
    if (order.userId !== userId) {
      logSecurityEvent('access_denied', { 
        action: 'create_dispute', 
        userId, 
        orderId,
        reason: 'not_order_owner' 
      });
      return NextResponse.json({ error: 'Это не ваш заказ' }, { status: 403 });
    }

    // ❗ Check order status
    const validStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (!validStatuses.includes(order.status)) {
      return NextResponse.json({ 
        error: 'Можно открыть спор только на оплаченный заказ' 
      }, { status: 400 });
    }

    // Check if already has dispute
    if (order.dispute) {
      return NextResponse.json({ 
        error: 'Спор по этому заказу уже открыт' 
      }, { status: 400 });
    }

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        orderId,
        reason,
        description,
        status: 'OPEN',
        createdBy: 'USER'  // Buyer
      }
    });

    // Update order status to DISPUTED
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'DISPUTED' }
    });

    logSecurityEvent('api_error', { 
      action: 'dispute_created', 
      userId,
      orderId,
      disputeId: dispute.id
    });

    return NextResponse.json({
      success: true,
      dispute
    }, { status: 201 });

  } catch (error) {
    console.error('Create dispute error:', error);
    logSecurityEvent('api_error', { 
      action: 'create_dispute', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка создания спора' },
      { status: 500 }
    );
  }
}

// GET /api/disputes - Get disputes (user's own or admin all)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    
    // Admin can see all, users only their own
    if (userRole !== 'ADMIN') {
      where.order = {
        userId
      };
    }

    if (status && ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              product: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),
      prisma.dispute.count({ where })
    ]);

    return NextResponse.json({
      disputes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Get disputes error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения споров' },
      { status: 500 }
    );
  }
}
