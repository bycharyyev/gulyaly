import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// POST /api/support/reply - ответить на сообщение в поддержку (для админа отвечающего клиенту)
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    
    const body = await request.json();
    const { replyMessage, targetUserId, attachment, attachmentType } = body;

    if (!targetUserId || !replyMessage) {
      return NextResponse.json({ error: 'Необходимы replyMessage и targetUserId' }, { status: 400 });
    }

    // Обновляем статус всех новых сообщений от этого пользователя на "READ"
    await prisma.supportMessage.updateMany({
      where: {
        userId: targetUserId,
        status: 'NEW'
      },
      data: { status: 'READ' }
    });

    // Создаем новое сообщение как ответ от админа
    // ВАЖНО: сообщение создается с userId клиента, чтобы оно было видно в его чате
    // senderId указывает, что это сообщение от админа
    // Админ тоже увидит это сообщение, потому что он получает все сообщения клиента
    const reply = await prisma.supportMessage.create({
      data: {
        userId: targetUserId, // Сообщение привязано к клиенту, чтобы было видно в его чате
        senderId: (session.user as any).id, // Отправитель - администратор
        subject: `[Админ] Ответ администратора`,
        message: replyMessage,
        status: 'REPLIED',
        attachment,
        attachmentType
      } as any,
      include: {
        user: true,
        sender: true
      }
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error('Ошибка ответа на сообщение в поддержку:', error);
    return NextResponse.json(
      { error: 'Ошибка ответа на сообщение в поддержку' },
      { status: 500 }
    );
  }
}

