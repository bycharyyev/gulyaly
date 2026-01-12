import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/support/user/[userId] - получить сообщения поддержки конкретного пользователя (только для админов)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = resolvedParams.userId;

    // Получаем сообщения от пользователя (клиента)
    // Админ видит все сообщения выбранного клиента (включая ответы админа)
    const supportMessages = await prisma.supportMessage.findMany({
      where: {
        userId: userId
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