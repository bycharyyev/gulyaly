import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOrderNotification } from '@/lib/notifications';
import { requireAdmin } from '@/lib/api-helpers';

export async function POST() {
  try {
    const { session, error } = await requireAdmin();
    
    if (error) {
      return error;
    }

    // Находим пользователя, товар и вариант с использованием Prisma
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      take: 1,
    });
    
    const products = await prisma.product.findMany({
      where: { isActive: true },
      take: 1,
      include: {
        variants: { take: 1 },
      },
    });

    if (users.length === 0 || products.length === 0) {
      return NextResponse.json({ 
        error: 'Нужен пользователь и товар в базе данных',
        usersCount: users.length,
        productsCount: products.length
      }, { status: 400 });
    }

    const user = users[0];
    const product = products[0];
    const variant = product.variants[0];

    if (!variant) {
      return NextResponse.json({ 
        error: 'У товара нет вариантов' 
      }, { status: 400 });
    }

    // Создаем тестовый заказ с использованием Prisma
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        productId: product.id,
        variantId: variant.id,
        amount: 29900,
        status: 'PAID',
        stripeSessionId: 'test_session_' + Date.now(),
      },
    });

    // Отправляем уведомление в Telegram
    await sendOrderNotification(order.id, user.id, product.id, 29900);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      userName: user.name,
      productName: product.name,
      amount: 29900,
      message: 'Тестовый заказ создан! Проверьте Telegram'
    });

  } catch (error) {
    console.error('Ошибка создания тестового заказа:', error);
    return NextResponse.json({ 
      error: 'Ошибка создания тестового заказа' 
    }, { status: 500 });
  }
}
