import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendOTP } from '@/lib/sms';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    
    console.log('🔍 [SEND-OTP] Запрос на отправку OTP:', { phone });

    if (!phone) {
      console.log('❌ [SEND-OTP] Отсутствует номер телефона');
      return NextResponse.json(
        { error: 'Номер телефона обязателен' },
        { status: 400 }
      );
    }

    // Генерируем 6-значный OTP код
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

    console.log('📱 [SEND-OTP] Сгенерирован OTP:', { otpCode, expiresAt });

    // Сохраняем OTP в базе данных
    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        otp: otpCode,
        otpExpiresAt: expiresAt,
        phoneVerified: false,
      },
      create: {
        phone,
        otp: otpCode,
        otpExpiresAt: expiresAt,
        phoneVerified: false,
        name: 'user', // Временное имя, обновится при входе
        role: 'USER',
        isOnline: false,
        lastSeenAt: new Date(),
      },
    });

    console.log('✅ [SEND-OTP] Пользователь создан/обновлен:', {
      id: user.id,
      phone: user.phone,
      name: user.name,
      phoneVerified: user.phoneVerified,
      otp: user.otp,
      otpExpiresAt: user.otpExpiresAt
    });

    // Отправляем SMS через реальный SMS gateway
    const smsSent = await sendOTP(phone, otpCode);
    
    if (!smsSent) {
      console.log('❌ [SEND-OTP] Ошибка отправки SMS');
      return NextResponse.json(
        { error: 'Не удалось отправить SMS. Попробуйте позже.' },
        { status: 500 }
      );
    }

    console.log(`📱 [SEND-OTP] OTP ${otpCode} отправлен на ${phone}`);

    return NextResponse.json({
      message: 'Код подтверждения отправлен по SMS'
    });

  } catch (error) {
    console.error('💥 [SEND-OTP] Ошибка отправки OTP:', error);
    return NextResponse.json(
      { error: 'Ошибка отправки кода подтверждения' },
      { status: 500 }
    );
  }
}
