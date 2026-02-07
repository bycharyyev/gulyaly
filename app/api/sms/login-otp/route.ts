import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { signIn } from 'next-auth/react';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();
    
    console.log('🔍 [LOGIN-OTP] Запрос:', { phone, code });

    if (!phone || !code) {
      console.log('❌ [LOGIN-OTP] Отсутствуют телефон или код');
      return NextResponse.json(
        { error: 'Номер телефона и код обязательны' },
        { status: 400 }
      );
    }

    // Ищем пользователя с правильным OTP
    let user = await prisma.user.findFirst({
      where: {
        phone,
        otp: code,
        otpExpiresAt: {
          gt: new Date(),
        },
      },
    });

    console.log('🔍 [LOGIN-OTP] Найден пользователь:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ [LOGIN-OTP] Пользователь не найден или неверный код');
      return NextResponse.json(
        { error: 'Неверный или просроченный код' },
        { status: 400 }
      );
    }

    // ✅ Проверяем, первый ли это вход пользователя
    const isFirstLogin = !user.phoneVerified;
    
    if (user) {
      console.log('📋 [LOGIN-OTP] Данные пользователя:', {
        id: user.id,
        phone: user.phone,
        name: user.name,
        phoneVerified: user.phoneVerified,
        isFirstLogin,
        otp: user.otp,
        otpExpiresAt: user.otpExpiresAt
      });
    }

    // Обновляем пользователя и очищаем OTP после успешного входа
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name || `Пользователь ${user.phone?.slice(-4)}`, // Если имени нет, создаем auto имя
        otp: null,
        otpExpiresAt: null,
        phoneVerified: true, // Помечаем как верифицированный
      },
    });

    console.log('✅ [LOGIN-OTP] Пользователь обновлен:', {
      id: updatedUser.id,
      name: updatedUser.name,
      phoneVerified: updatedUser.phoneVerified,
      isFirstLogin,
      otp: updatedUser.otp
    });

    // Создаем сессию для пользователя
    // Возвращаем данные пользователя для создания сессии на клиенте
    console.log('🎯 [LOGIN-OTP] Возвращаем успешный ответ');
    return NextResponse.json({
      message: 'Вход успешен',
      isFirstLogin, // ✅ Флаг для показа приветственной анимации
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
      }
    });

  } catch (error) {
    console.error('💥 [LOGIN-OTP] Ошибка входа по OTP:', error);
    return NextResponse.json(
      { error: 'Ошибка входа' },
      { status: 500 }
    );
  }
}
