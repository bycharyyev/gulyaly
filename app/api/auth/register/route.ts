import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { 
  validateEmail, 
  validatePasswordStrength, 
  sanitizeString,
  checkRateLimit,
  logSecurityEvent
} from '@/lib/security';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

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
    if (!name || !email || !password) {
      logSecurityEvent('invalid_input', { action: 'register', reason: 'missing_fields' });
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    // Валидация email
    if (!validateEmail(email)) {
      logSecurityEvent('invalid_input', { action: 'register', reason: 'invalid_email' });
      return NextResponse.json(
        { error: 'Неверный формат email' },
        { status: 400 }
      );
    }

    // Проверка силы пароля
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      logSecurityEvent('invalid_input', { 
        action: 'register', 
        reason: 'weak_password',
        errors: passwordValidation.errors 
      });
      return NextResponse.json(
        { 
          error: 'Пароль слишком слабый',
          details: passwordValidation.errors 
        },
        { status: 400 }
      );
    }

    // Санитизация имени (защита от XSS)
    const sanitizedName = sanitizeString(name);

    // Проверяем существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logSecurityEvent('invalid_input', { action: 'register', reason: 'email_exists', email });
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      );
    }

    // Хешируем пароль (используем 12 раундов для большей безопасности)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Создаём пользователя
    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        email: email.toLowerCase(), // Email в нижнем регистре
        password: hashedPassword,
        role: 'USER', // По умолчанию обычный пользователь
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    logSecurityEvent('login', { 
      action: 'register_success', 
      userId: user.id, 
      email: user.email 
    });

    return NextResponse.json({
      message: 'Регистрация успешна!',
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
