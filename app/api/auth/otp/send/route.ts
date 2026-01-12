import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOTP, sendOTP } from '@/lib/sms';
import { auth } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

// POST /api/auth/otp/send - Отправить OTP код на телефон
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber } = body;

    // Валидация номера телефона
    if (!phoneNumber || !phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        { error: 'Неверный формат номера телефона' },
        { status: 400 }
      );
    }

    // Проверяем не занят ли номер другим пользователем
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: phoneNumber as string | null,
        NOT: {
          id: (session.user as any).id,
        },
      } as Prisma.UserWhereInput,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Этот номер телефона уже используется' },
        { status: 400 }
      );
    }

    // Генерируем OTP код
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

    // Сохраняем OTP в БД
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: {
        phone: phoneNumber as string | null,
        otp: otpCode,
        otpExpiresAt: expiresAt,
        phoneVerified: false,
      } as Prisma.UserUpdateInput,
    });

    // Отправляем SMS
    const sent = await sendOTP(phoneNumber, otpCode);

    if (!sent) {
      return NextResponse.json(
        { error: 'Ошибка отправки SMS' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'OTP код отправлен на ваш телефон',
      expiresIn: 300, // секунд
    });
  } catch (error) {
    console.error('Ошибка отправки OTP:', error);
    return NextResponse.json(
      { error: 'Ошибка отправки OTP' },
      { status: 500 }
    );
  }
}
