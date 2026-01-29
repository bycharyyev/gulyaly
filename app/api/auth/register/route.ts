import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  sanitizeString,
  checkRateLimit,
  logSecurityEvent
} from '@/lib/security';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    // Rate limiting - максимум 5 попыток регистрации в минуту
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`register:${clientIp}`, 5, 60000)) {
      logSecurityEvent('rate_limit', { action: 'register', ip: clientIp });
      return NextResponse.json(
        { error: 'Слишком много попыток. Подождите минуту' },
        { status: 429 }
      );
    }

    // Валидация
    if (!name || !phone) {
      logSecurityEvent('invalid_input', { action: 'register', reason: 'missing_fields' });
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    // Санитизация имени (защита от XSS)
    const sanitizedName = sanitizeString(name);

    // Проверяем существует ли пользователь с таким телефоном
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      logSecurityEvent('invalid_input', { action: 'register', reason: 'phone_exists', phone });
      return NextResponse.json(
        { error: 'Пользователь с таким номером телефона уже существует' },
        { status: 400 }
      );
    }

    // Создаём пользователя без пароля (только телефонная аутентификация)
    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        phone: phone,
        phoneVerified: false, // Будет подтверждён после SMS верификации
        role: 'USER', // По умолчанию обычный пользователь
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    logSecurityEvent('login', { 
      action: 'register_success', 
      userId: user.id, 
      phone: user.phone 
    });

    return NextResponse.json({
      message: 'Регистрация успешна! Подтвердите номер телефона для входа.',
      user,
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    logSecurityEvent('invalid_input', { 
      action: 'register_error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Ошибка регистрации' },
      { status: 500 }
    );
  }
}
