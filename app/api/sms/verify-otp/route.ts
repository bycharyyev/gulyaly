import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { phone, code, name } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Номер телефона и код обязательны' },
        { status: 400 }
      );
    }

    // Ищем пользователя с правильным OTP
    const user = await prisma.user.findFirst({
      where: {
        phone,
        otp: code,
        otpExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный или просроченный код' },
        { status: 400 }
      );
    }

    // Обновляем пользователя
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        phoneVerified: true,
        otp: null, // Очищаем OTP после верификации
        otpExpiresAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        email: true,
        phoneVerified: true,
      }
    });

    return NextResponse.json({
      message: 'Номер телефона подтвержден',
      user: updatedUser
    });

  } catch (error) {
    console.error('Ошибка верификации OTP:', error);
    return NextResponse.json(
      { error: 'Ошибка верификации кода' },
      { status: 500 }
    );
  }
}
