import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendOTP } from '@/lib/sms';
import { checkRateLimit, logSecurityEvent, validatePhoneNumber } from '@/lib/security';

const prisma = new PrismaClient();

// Rate limiting constants
const MAX_OTP_PER_PHONE = 3; // Maximum OTP sends per phone per hour
const OTP_COOLDOWN = 60; // Seconds between OTP sends
const MAX_OTP_PER_IP = 10; // Maximum OTP sends per IP per hour

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    
    // Validate request body
    if (!phone) {
      logSecurityEvent('invalid_input', { action: 'otp_send', reason: 'missing_phone' });
      return NextResponse.json(
        { error: 'Номер телефона обязателен' },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!validatePhoneNumber(phone)) {
      logSecurityEvent('invalid_input', { action: 'otp_send', reason: 'invalid_phone_format', phone: phone.substring(0, 5) + '***' });
      return NextResponse.json(
        { error: 'Неверный формат номера телефона' },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Rate limiting by IP
    if (!checkRateLimit(`otp_ip:${clientIp}`, MAX_OTP_PER_IP, 3600000)) {
      logSecurityEvent('rate_limit', { action: 'otp_send', reason: 'ip_rate_limit', ip: clientIp });
      return NextResponse.json(
        { error: 'Слишком много запросов. Подождите час' },
        { status: 429 }
      );
    }

    // Rate limiting by phone
    if (!checkRateLimit(`otp_phone:${phone}`, MAX_OTP_PER_PHONE, 3600000)) {
      logSecurityEvent('rate_limit', { action: 'otp_send', reason: 'phone_rate_limit', phone: phone.substring(0, 5) + '***' });
      return NextResponse.json(
        { error: 'Слишком много кодов на этот номер. Подождите час' },
        { status: 429 }
      );
    }

    // Check if there's a recent OTP that hasn't expired (cooldown)
    const existingUser = await prisma.user.findUnique({
      where: { phone },
      select: { otpExpiresAt: true }
    });

    if (existingUser?.otpExpiresAt) {
      const expiresAt = new Date(existingUser.otpExpiresAt);
      const now = new Date();
      const secondsUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / 1000);
      
      if (secondsUntilExpiry > 30) {
        // There's still a valid OTP, reject new request
        logSecurityEvent('rate_limit', { action: 'otp_send', reason: 'otp_cooldown', phone: phone.substring(0, 5) + '***' });
        return NextResponse.json(
          { error: 'Код уже отправлен. Подождите перед повторной отправкой' },
          { status: 429 }
        );
      }
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to database
    await prisma.user.upsert({
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
        name: 'user',
        role: 'USER',
        isOnline: false,
        lastSeenAt: new Date(),
      },
    });

    // Send SMS via gateway
    const smsSent = await sendOTP(phone, otpCode);
    
    if (!smsSent) {
      logSecurityEvent('otp', { action: 'otp_send', reason: 'sms_gateway_error', phone: phone.substring(0, 5) + '***' });
      return NextResponse.json(
        { error: 'Не удалось отправить SMS. Попробуйте позже.' },
        { status: 500 }
      );
    }

    logSecurityEvent('otp', { action: 'otp_send_success', phone: phone.substring(0, 5) + '***' });

    return NextResponse.json({
      message: 'Код подтверждения отправлен по SMS'
    });

  } catch (error) {
    logSecurityEvent('otp', { action: 'otp_send_error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Ошибка отправки кода подтверждения' },
      { status: 500 }
    );
  }
}
