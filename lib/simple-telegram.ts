// Максимально простой Telegram бот для уведомлений

export async function sendSimpleTelegramNotification(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('⚠️ Telegram не настроен');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });

    if (response.ok) {
      console.log('✅ Telegram отправлено');
    } else {
      console.log('❌ Ошибка Telegram');
    }
  } catch (error) {
    console.log('❌ Ошибка:', error);
  }
}
