import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Helper function to extract params
async function getId(params: Promise<{ id: string }>): Promise<string> {
  const resolvedParams = await params;
  return resolvedParams.id;
}

// POST /api/support/[id]/reply - ответить на сообщение в поддержку (DEPRECATED - используйте /api/support/reply)
// POST /api/support/reply - ответить на сообщение в поддержку
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    
    const id = await getId(params);
    const body = await request.json();
    const { replyMessage, targetUserId } = body;

    // Если указан targetUserId, значит админ отвечает конкретному пользователю
    if (targetUserId) {
      // Обновляем статус всех новых сообщений от этого пользователя на "READ"
      await prisma.supportMessage.updateMany({
        where: {
          userId: targetUserId,
          status: 'NEW'
        },
        data: { status: 'READ' }
      });

      // Создаем новое сообщение как ответ от админа пользователю
      // Сообщение создается от имени админа, но связано с беседой пользователя
      const reply = await prisma.supportMessage.create({
        data: {
          userId: targetUserId, // Связываем с пользователем, которому отвечаем
          senderId: (session.user as any).id, // Указываем, кто отправил (админ)
          subject: `Ответ от администратора`,
          message: replyMessage,
          status: 'REPLIED'
        },
        include: {
          user: true,
          sender: true
        }
      });

      return NextResponse.json(reply);
    }

    // Старая логика (для обратной совместимости)
    const originalMessage = await prisma.supportMessage.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!originalMessage) {
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    // Обновляем статус оригинального сообщения на "REPLIED"
    await prisma.supportMessage.update({
      where: { id },
      data: { status: 'REPLIED' }
    });

    // Создаем новое сообщение как ответ от админа пользователю
    // Сообщение создается от имени админа, но связано с беседой пользователя
    const reply = await prisma.supportMessage.create({
      data: {
        userId: originalMessage.userId, // Связываем с пользователем, который отправил оригинальное сообщение
        senderId: (session.user as any).id, // Указываем, кто отправил (админ)
        subject: `Re: ${originalMessage.subject}`,
        message: replyMessage,
        status: 'REPLIED'
      },
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