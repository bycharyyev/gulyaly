import { NextResponse } from 'next/server';
import { sendSimpleTelegramNotification } from '@/lib/simple-telegram';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';

export async function POST() {
  try {
    const { session, error } = await requireAdmin();
    
    if (error) {
      return error;
    }

    // Простое тестовое уведомление
    await sendSimpleTelegramNotification('🛒 НОВЫЙ ЗАКАЗ!\n\n📦 Товар: Тестовый товар\n💰 Сумма: 299 ₽\n👤 Клиент: Тестовый клиент\n\n🎉 Уведомление работает!');

    return NextResponse.json({ success: true, message: 'Уведомление отправлено!' });
  } catch (error) {
    return handleApiError(error, 'simple-notify');
  }
}
