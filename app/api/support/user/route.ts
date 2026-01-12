import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/support/user - получить сообщения поддержки текущего пользователя
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const currentUserId = (session.user as any).id;
    
    // Получаем сообщения текущего пользователя (клиента)
    // Клиент видит все сообщения, связанные с его аккаунтом (включая ответы админов)
    const supportMessages = await prisma.supportMessage.findMany({
      where: {
        userId: currentUserId
      },
      include: {
        user: true,
        sender: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json(supportMessages);
  } catch (error) {
    console.error('Ошибка получения сообщений поддержки:', error);
    return NextResponse.json(
      { error: 'Ошибка получения сообщений поддержки' },
      { status: 500 }
    );
  }
}