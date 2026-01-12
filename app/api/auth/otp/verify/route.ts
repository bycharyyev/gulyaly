import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Тип для пользователя с OTP полями
type UserWithOTP = {
  id: string;
  phone: string | null;
  otp: string | null;
  otpExpiresAt: Date | null;
  phoneVerified: boolean;
};

// POST /api/auth/otp/verify - Проверить OTP код
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Неверный формат кода' },
        { status: 400 }
      );
    }

    // Получаем пользователя с OTP
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    }) as any as UserWithOTP | null;

    if (!user || !user.otp || !user.otpExpiresAt) {
      return NextResponse.json(
        { error: 'OTP код не найден. Запросите новый код' },
        { status: 400 }
      );
    }

    // Проверяем не истек ли код
    if (new Date() > user.otpExpiresAt) {
      return NextResponse.json(
        { error: 'OTP код истек. Запросите новый код' },
        { status: 400 }
      );
    }

    // Проверяем код
    if (user.otp !== code) {
      return NextResponse.json(
        { error: 'Неверный код' },
        { status: 400 }
      );
    }

    // Подтверждаем телефон и очищаем OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
        otp: null,
        otpExpiresAt: null,
      } as any,
    });

    return NextResponse.json({
      message: 'Телефон успешно подтвержден!',
      phoneNumber: user.phone,
    });
  } catch (error) {
    console.error('Ошибка проверки OTP:', error);
    return NextResponse.json(
      { error: 'Ошибка проверки OTP' },
      { status: 500 }
    );
  }
}
