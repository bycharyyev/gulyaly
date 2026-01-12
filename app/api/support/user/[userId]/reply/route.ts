import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Helper function to extract params
async function getUserId(params: Promise<{ userId: string }>): Promise<string> {
  const resolvedParams = await params;
  return resolvedParams.userId;
}

// POST /api/support/user/[userId]/reply - ответить админа пользователю
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    
    const clientUserId = await getUserId(params);
    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    // Получаем клиента для проверки что он существует
    const client = await prisma.user.findUnique({
      where: { id: clientUserId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Создаем сообщение от админа, но с userId клиента чтобы оно было видно в его чате
    // senderId указывает, что это сообщение от администратора
    const reply = await prisma.supportMessage.create({
      data: {
        userId: clientUserId, // Сообщение привязано к клиенту, чтобы было видно в его чате
        senderId: (session.user as any).id, // Отправитель - администратор
        subject: `[Админ] Ответ на обращение`,
        message: message,
        status: 'REPLIED'
      },
      include: {
        user: true,
        sender: true
      }
    });

    // Обновляем статус последнего сообщения клиента на READ
    await prisma.supportMessage.updateMany({
      where: {
        userId: clientUserId,
        status: 'NEW'
      },
      data: {
        status: 'READ'
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

