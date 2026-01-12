import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/support/react - Добавить реакцию на сообщение
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { messageId, emoji } = await request.json();

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    // Получить текущее сообщение
    const message = await prisma.supportMessage.findUnique({
      where: { id: messageId }
    }) as any;

    if (!message) {
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    // Обновить реакции
    const reactions = message.reactions ? JSON.parse(JSON.stringify(message.reactions)) : {};
    
    if (reactions[emoji]) {
      reactions[emoji] += 1;
    } else {
      reactions[emoji] = 1;
    }

    // Сохранить обновленные реакции
    await prisma.supportMessage.update({
      where: { id: messageId },
      data: { reactions } as any
    });

    return NextResponse.json({ success: true, reactions });

  } catch (error) {
    console.error('Ошибка добавления реакции:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
