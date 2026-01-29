const { PrismaClient } = require('@prisma/client');
const { sendOrderNotification } = require('../lib/notifications');

const prisma = new PrismaClient();

async function createTestOrder() {
  try {
    console.log('🧪 Создаем тестовый заказ...');

    // Находим пользователя и товар
    const user = await prisma.user.findFirst({
      where: { role: 'USER' }
    });

    const product = await prisma.product.findFirst({
      where: { isActive: true }
    });

    if (!user || !product) {
      console.log('❌ Нужен пользователь и товар в базе данных');
      return;
    }

    // Создаем тестовый заказ
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        productId: product.id,
        amount: 29900, // 299.00 в копейках
        status: 'PAID',
        stripeSessionId: 'test_session_' + Date.now()
      }
    });

    console.log('✅ Заказ создан:', order.id);

    // Отправляем уведомление в Telegram
    await sendOrderNotification(order.id, user.id, product.id, order.amount);

    console.log('🎉 Тестовый заказ и уведомление созданы!');
    console.log('📱 Проверь Telegram @gulyalyorderbot');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestOrder();
