import { prisma } from './prisma';

// Отправка уведомлений о новых заказах
export async function sendOrderNotification(orderId: string, userId: string, productId: string, amount: number) {
  try {
    // Получаем информацию о заказе
    const orderInfo = await prisma.$queryRawUnsafe(`
      SELECT 
        o.id,
        o.amount,
        o.status,
        o.createdAt,
        u.name as userName,
        u.email as userEmail,
        u.phone as userPhone,
        p.name as productName,
        pv.name as variantName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN products p ON o.productId = p.id
      LEFT JOIN product_variants pv ON o.variantId = pv.id
      WHERE o.id = ?
    `, orderId) as any[];

    const order = orderInfo[0];
    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }

    // Получаем настройки для уведомлений
    const footerSettings = await prisma.$queryRawUnsafe(`
      SELECT email, phone, telegram FROM footer_settings LIMIT 1
    `) as any[];

    const settings = footerSettings[0] || {};

    // Формируем сообщение
    const message = `
🛒 НОВЫЙ ЗАКАЗ #${order.id}

👤 Клиент: ${order.userName || 'Не указано'}
📧 Email: ${order.userEmail || 'Не указано'}
📱 Телефон: ${order.userPhone || 'Не указано'}

📦 Товар: ${order.productName}
🎯 Вариант: ${order.variantName || 'Основной'}
💰 Сумма: ${order.amount / 100} ₽

📅 Дата: ${new Date(order.createdAt).toLocaleString('ru-RU')}
🔥 Статус: ${order.status}

---
Срочно обработайте заказ!
    `.trim();

    // 1. Отправка в Telegram (если настроен)
    if (settings.telegram) {
      await sendTelegramNotification(settings.telegram, message);
    }

    // 2. Отправка Email (если настроен)
    if (settings.email) {
      await sendEmailNotification(settings.email, order, message);
    }

    // 3. Отправка SMS (если настроен)
    if (settings.phone) {
      await sendSMSNotification(settings.phone, `Новый заказ #${order.id} на сумму ${order.amount / 100} ₽`);
    }

    console.log('✅ Order notifications sent for order:', orderId);

  } catch (error) {
    console.error('❌ Error sending order notifications:', error);
  }
}

// Отправка в Telegram
async function sendTelegramNotification(telegramUrl: string, message: string) {
  try {
    // Извлекаем username из URL вида https://t.me/username
    const username = telegramUrl.replace('https://t.me/', '').replace('@', '').trim();
    
    // Получаем Telegram Bot Token и Chat ID из env
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.log('⚠️ Telegram not configured (missing BOT_TOKEN or CHAT_ID)');
      return;
    }

    // Отправляем уведомление администратору
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (response.ok) {
      console.log('✅ Telegram notification sent to admin');
    } else {
      console.error('❌ Telegram notification failed:', await response.text());
    }
  } catch (error) {
    console.error('❌ Telegram error:', error);
  }
}

// Отправка Email
async function sendEmailNotification(email: string, order: any, message: string) {
  try {
    // Здесь можно интегрировать любой email сервис
    // Например: Nodemailer, Resend, SendGrid и т.д.
    
    console.log('📧 Email notification (не реализовано):');
    console.log('   To:', email);
    console.log('   Subject: `Новый заказ #${order.id}`');
    console.log('   Message length:', message.length);
    
    // TODO: Добавить реальную отправку email
    // Пример с Nodemailer:
    /*
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Новый заказ #${order.id}`,
      text: message,
    });
    */
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}

// Отправка SMS
async function sendSMSNotification(phone: string, message: string) {
  try {
    // Используем существующий SMS шлюз
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
    const orderInfo = await prisma.$queryRawUnsafe(`
      SELECT 
        o.id,
        o.status,
        u.email as userEmail,
        u.phone as userPhone,
        p.name as productName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN products p ON o.productId = p.id
      WHERE o.id = ?
    `, orderId) as any[];

    const order = orderInfo[0];
    if (!order) return;

    const statusMessages = {
      'PENDING': '🔄 Ваш заказ принят в обработку',
      'PAID': '✅ Ваш заказ оплачен',
      'PROCESSING': '🚀 Ваш заказ в обработке',
      'COMPLETED': '🎉 Ваш заказ выполнен',
      'CANCELLED': '❌ Ваш заказ отменен'
    };

    const message = statusMessages[newStatus as keyof typeof statusMessages] || `Статус заказа изменен на: ${newStatus}`;

    // Отправляем SMS клиенту
    if (order.userPhone) {
      const { sendSMS } = await import('./sms-gateway');
      await sendSMS(order.userPhone, `${message} #${order.id} (${order.productName})`);
    }

    console.log(`✅ Status notification sent for order ${orderId}: ${newStatus}`);
  } catch (error) {
    console.error('❌ Error sending status notification:', error);
  }
}
