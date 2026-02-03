import { prisma } from './prisma';

// Отправка уведомлений о новых заказах
export async function sendOrderNotification(orderId: string, userId: string, productId: string, amount: number) {
  try {
    // Получаем информацию о заказе через Prisma
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        product: { select: { name: true } },
        variant: { select: { name: true } },
      },
    });

    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }

    // Получаем настройки для уведомлений
    const settings = await prisma.footerSettings.findFirst({
      select: { email: true, phone: true, telegram: true },
    });

    // Формируем сообщение
    const message = `
🛒 НОВЫЙ ЗАКАЗ #${order.id}

👤 Клиент: ${order.user?.name || 'Не указано'}
📧 Email: ${order.user?.email || 'Не указано'}
📱 Телефон: ${order.user?.phone || 'Не указано'}

📦 Товар: ${order.product?.name}
🎯 Вариант: ${order.variant?.name || 'Основной'}
💰 Сумма: ${amount / 100} ₽

📅 Дата: ${new Date(order.createdAt).toLocaleString('ru-RU')}
🔥 Статус: ${order.status}

---
Срочно обработайте заказ!
    `.trim();

    // 1. Отправка в Telegram (если настроен)
    if (settings?.telegram) {
      await sendTelegramNotification(settings.telegram, message);
    }

    // 2. Отправка Email (если настроен)
    if (settings?.email) {
      await sendEmailNotification(settings.email, order, message);
    }

    // 3. Отправка SMS (если настроен)
    if (settings?.phone) {
      await sendSMSNotification(settings.phone, `Новый заказ #${order.id} на сумму ${amount / 100} ₽`);
    }

    console.log('✅ Order notifications sent for order:', orderId);

  } catch (error) {
    console.error('❌ Error sending order notifications:', error);
  }
}

// Отправка в Telegram
async function sendTelegramNotification(telegramUrl: string, message: string) {
  try {
    const username = telegramUrl.replace('https://t.me/', '').replace('@', '').trim();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.log('⚠️ Telegram not configured');
      return;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });

    if (!response.ok) {
      console.error('❌ Telegram notification failed:', await response.text());
    }
  } catch (error) {
    console.error('❌ Telegram error:', error);
  }
}

// Отправка Email
async function sendEmailNotification(email: string, order: any, message: string) {
  try {
    console.log('📧 Email notification (не реализовано):', email);
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}

// Отправка SMS
async function sendSMSNotification(phone: string, message: string) {
  try {
    const { sendSMS } = await import('./sms-gateway');
    await sendSMS(phone, message);
    console.log('✅ SMS notification sent');
  } catch (error) {
    console.error('❌ SMS error:', error);
  }
}

// Уведомление об изменении статуса заказа
export async function sendOrderStatusNotification(orderId: string, newStatus: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { phone: true } },
        product: { select: { name: true } },
      },
    });

    if (!order) return;

    const statusMessages: Record<string, string> = {
      'PENDING': '🔄 Ваш заказ принят в обработку',
      'PAID': '✅ Ваш заказ оплачен',
      'PROCESSING': '🚀 Ваш заказ в обработке',
      'COMPLETED': '🎉 Ваш заказ выполнен',
      'CANCELLED': '❌ Ваш заказ отменен'
    };

    const message = statusMessages[newStatus] || `Статус заказа изменен на: ${newStatus}`;

    if (order.user?.phone) {
      const { sendSMS } = await import('./sms-gateway');
      await sendSMS(order.user.phone, `${message} #${order.id} (${order.product?.name})`);
    }

    console.log(`✅ Status notification sent for order ${orderId}: ${newStatus}`);
  } catch (error) {
    console.error('❌ Error sending status notification:', error);
  }
}
