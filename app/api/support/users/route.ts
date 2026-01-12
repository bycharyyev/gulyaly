import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/support/users - получить пользователей с сообщениями в поддержке (только для админов)
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Получаем пользователей с их сообщениями в поддержке
    const usersWithMessages = await prisma.user.findMany({
      where: {
        supportMessages: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        supportMessages: {
          select: {
            status: true
          },
          where: {
            status: 'NEW'
          }
        }
      }
    });

    // Добавляем количество непрочитанных сообщений для каждого пользователя
    const usersWithUnreadCounts = usersWithMessages.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      unreadCount: user.supportMessages.length
    }));

    return NextResponse.json(usersWithUnreadCounts);
  } catch (error) {
    console.error('Ошибка получения пользователей с сообщениями в поддержке:', error);
    return NextResponse.json(
      { error: 'Ошибка получения пользователей с сообщениями в поддержке' },
      { status: 500 }
    );
  }
}