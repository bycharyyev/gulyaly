import { NextResponse } from 'next/server';

// Простой бот только для уведомлений о заказах
// Только администратор может получать уведомления

export async function POST(request: Request) {
  try {
    const update = await request.json();
    
    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id.toString();
    const text = message.text || '';

    console.log(`📨 Telegram message from ${chatId}: ${text}`);

    // Проверяем что это администратор
    const adminChatId = process.env.TELEGRAM_CHAT_ID;
    
    if (chatId !== adminChatId) {
      await sendMessage(chatId, 
        '❌ Доступ запрещен. Этот бот только для администратора.'
      );
      return NextResponse.json({ ok: true });
    }

    // Обработка команд только для администратора
    if (text.startsWith('/')) {
      await handleAdminCommand(chatId, text);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

async function handleAdminCommand(chatId: string, text: string) {
  switch (text) {
    case '/start':
      await sendMessage(chatId, 
        `👋 Добро пожаловать в Gulyaly Orders Bot!

🎯 Этот бот отправляет уведомления о новых заказах.

📋 Команды:
/start - Это сообщение
/status - Статус бота
/help - Помощь

✅ Бот активен и готов принимать уведомления о заказах!`
      );
      break;

    case '/status':
      await sendMessage(chatId, 
        `✅ Статус бота: Активен

🔔 Уведомления: Включены
👤 Доступ: Только администратор
📦 Тип: Заказы

🎉 Бот готов получать уведомления о новых заказах!`
      );
      break;

    case '/help':
      await sendMessage(chatId,
        `🤖 Gulyaly Orders Bot - Помощь

📦 Назначение: Уведомления о заказах
👤 Доступ: Только администратор
🔔 Тип: Новые заказы и статусы

📋 Команды:
/start - Приветствие
/status - Статус бота
/help - Эта справка

📬 Уведомления приходят автоматически при:
• Создании нового заказа
• Изменении статуса заказа

⚠️ Бот только для администратора!`
      );
      break;

    default:
      await sendMessage(chatId, '❓ Неизвестная команда. Используйте /help для справки');
  }
}

// Отправка сообщения в Telegram
async function sendMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}
