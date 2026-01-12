import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/support/unread-count - получить количество непрочитанных сообщений (только для админов)
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const unreadCount = await prisma.supportMessage.count({
      where: {
        status: 'NEW'
      }
    });

    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error('Ошибка получения количества непрочитанных сообщений:', error);
    return NextResponse.json(
      { error: 'Ошибка получения количества непрочитанных сообщений' },
      { status: 500 }
    );
  }
}