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
    const { name, email, phone, password, authMethod } = body;

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
    if (!name) {
      logSecurityEvent('invalid_input', { action: 'register', reason: 'missing_name' });
      return NextResponse.json(
        { error: 'Имя обязательно' },
        { status: 400 }
      );
    }

    const sanitizedName = sanitizeString(name);

    // Email/password регистрация
    if (authMethod === 'email') {
      if (!email || !password) {
        logSecurityEvent('invalid_input', { action: 'register', reason: 'missing_email_or_password' });
        return NextResponse.json(
          { error: 'Email и пароль обязательны для email-регистрации' },
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

      // Проверяем существует ли пользователь с таким email
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        logSecurityEvent('invalid_input', { action: 'register', reason: 'email_exists', email });
        return NextResponse.json(
          { error: 'Пользователь с таким email уже существует' },
          { status: 400 }
        );
      }

      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(password, 12);

      // Создаём пользователя с email/password
      const user = await prisma.user.create({
        data: {
          name: sanitizedName,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'USER',
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
        email: user.email,
        method: 'email'
      });

      return NextResponse.json({
        message: 'Регистрация успешна! Войдите с помощью email и пароля.',
        user,
      });
    }
    
    // Phone/SMS регистрация
    else {
      if (!phone) {
        logSecurityEvent('invalid_input', { action: 'register', reason: 'missing_phone' });
        return NextResponse.json(
          { error: 'Номер телефона обязателен для phone-регистрации' },
          { status: 400 }
        );
      }

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
          role: 'USER',
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
        phone: user.phone,
        method: 'phone'
      });

      return NextResponse.json({
        message: 'Регистрация успешна! Подтвердите номер телефона для входа.',
        user,
      });
    }
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
