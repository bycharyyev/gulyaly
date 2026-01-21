import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  sanitizeString,
  checkRateLimit,
  logSecurityEvent
} from '@/lib/security';

// PUT /api/user/profile - обновить профиль пользователя
export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'update_profile', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Rate limiting - максимум 10 обновлений профиля в минуту
    if (!checkRateLimit(`profile:${userId}`, 10, 60000)) {
      logSecurityEvent('rate_limit', { action: 'update_profile', userId });
      return NextResponse.json(
        { error: 'Слишком много запросов. Подождите' },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    const { name, email, phone } = body;

    // Проверяем что email не занят другим пользователем
    if (email && email !== (session.user as any).email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser && existingUser.id !== userId) {
        logSecurityEvent('invalid_input', { action: 'update_profile', userId, reason: 'email_exists' });
        return NextResponse.json(
          { error: 'Email уже используется' },
          { status: 400 }
        );
      }
    }

    // Проверяем что телефон не занят другим пользователем
    if (phone && phone !== (session.user as any).phone) {
      const existingUser = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingUser && existingUser.id !== userId) {
        logSecurityEvent('invalid_input', { action: 'update_profile', userId, reason: 'phone_exists' });
        return NextResponse.json(
          { error: 'Номер телефона уже используется' },
          { status: 400 }
        );
      }
    }

    // Санитизация имени
    const sanitizedName = name ? sanitizeString(name) : undefined;
    const sanitizedEmail = email ? email.toLowerCase() : undefined;

    // Обновляем профиль
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: sanitizedName,
        email: sanitizedEmail,
        phone: phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления профиля' },
      { status: 500 }
    );
  }
}

// GET /api/user/profile - получить профиль пользователя
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    return NextResponse.json(
      { error: 'Ошибка получения профиля' },
      { status: 500 }
    );
  }
}
