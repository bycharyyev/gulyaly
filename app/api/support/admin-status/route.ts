import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/support/admin-status - Получить статус админа
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Найти первого админа (можно расширить логику для нескольких админов)
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    }) as any;

    if (!admin) {
      return NextResponse.json({ 
        isOnline: false, 
        lastSeenAt: new Date().toISOString() 
      });
    }

    return NextResponse.json({
      isOnline: admin.isOnline,
      lastSeenAt: admin.lastSeenAt.toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения статуса админа:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/support/admin-status - Обновить статус админа (автоматически при активности)
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { isOnline } = await request.json();

    // Обновить статус админа
    await prisma.user.update({
      where: {
        id: (session.user as any).id
      },
      data: {
        isOnline: isOnline ?? true,
        lastSeenAt: new Date()
      } as any
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Ошибка обновления статуса админа:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
