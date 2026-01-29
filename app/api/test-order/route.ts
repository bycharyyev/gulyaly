import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOrderNotification } from '@/lib/notifications';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';

export async function POST() {
  try {
    const { session, error } = await requireAdmin();
    
    if (error) {
      return error;
    }

    console.log('🧪 Создаем тестовый заказ...');

    // Находим пользователя, товар и вариант
    const users = await prisma.$queryRaw`SELECT id, name FROM users WHERE role = 'USER' LIMIT 1` as any[];
    const products = await prisma.$queryRaw`SELECT id, name FROM products WHERE isActive = true LIMIT 1` as any[];
    const variants = await prisma.$queryRaw`SELECT id FROM product_variants LIMIT 1` as any[];

    if (users.length === 0 || products.length === 0) {
      return NextResponse.json({ 
        error: 'Нужен пользователь и товар в базе данных',
        usersCount: users.length,
        productsCount: products.length
      }, { status: 400 });
    }

    const user = users[0];
    const product = products[0];
    const variant = variants[0] || { id: 'default_variant' };

    // Создаем тестовый заказ (безопасный запрос)
    const orderId = 'test_order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    await prisma.$queryRaw`
      INSERT INTO orders (id, userId, productId, variantId, amount, status, stripeSessionId, createdAt, updatedAt)
      VALUES (${orderId}, ${user.id}, ${product.id}, ${variant.id}, 29900, 'PAID', ${'test_session_' + Date.now()}, datetime('now'), datetime('now'))
    `;

    console.log('✅ Заказ создан:', orderId);

    // Отправляем уведомление в Telegram
    await sendOrderNotification(orderId, user.id, product.id, 29900);

    console.log('🎉 Тестовый заказ и уведомление созданы!');

    return NextResponse.json({
      success: true,
      orderId: orderId,
      userName: user.name,
      productName: product.name,
      amount: 29900,
      message: '🎉 Тестовый заказ создан! Проверь Telegram @gulyalyorderbot'
    });

  } catch (error) {
    console.error('❌ Ошибка создания тестового заказа:', error);
    return NextResponse.json({ 
      error: 'Ошибка создания тестового заказа',
      details: error.message 
    }, { status: 500 });
  }
}
