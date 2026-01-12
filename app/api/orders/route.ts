import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, logSecurityEvent } from '@/lib/security';

// GET /api/orders - получить заказы пользователя
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'get_orders', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Rate limiting
    if (!checkRateLimit(`orders:${userId}`, 30, 60000)) {
      logSecurityEvent('rate_limit', { action: 'get_orders', userId });
      return NextResponse.json(
        { error: 'Слишком много запросов' },
        { status: 429 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        product: true,
        variant: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки заказов' },
      { status: 500 }
    );
  }
}

// POST /api/orders - создать новый заказ
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'create_order', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Rate limiting - максимум 10 заказов в минуту
    if (!checkRateLimit(`create_order:${userId}`, 10, 60000)) {
      logSecurityEvent('rate_limit', { action: 'create_order', userId });
      return NextResponse.json(
        { error: 'Слишком много заказов. Подождите минуту' },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    const { productId, variantId } = body;

    // Получаем вариант продукта для проверки цены
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || !variant.product.isActive) {
      logSecurityEvent('invalid_input', { 
        action: 'create_order', 
        userId, 
        reason: 'product_unavailable',
        productId,
        variantId 
      });
      return NextResponse.json(
        { error: 'Продукт недоступен' },
        { status: 400 }
      );
    }

    // Создаем заказ
    const order = await prisma.order.create({
      data: {
        userId,
        productId,
        variantId,
        amount: variant.price,
        status: 'PENDING',
      },
      include: {
        product: true,
        variant: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Ошибка создания заказа:', error);
    return NextResponse.json(
      { error: 'Ошибка создания заказа' },
      { status: 500 }
    );
  }
}
