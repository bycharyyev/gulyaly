import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sanitizeString, checkRateLimit, logSecurityEvent } from '@/lib/security';

// POST /api/support - создать новое сообщение в поддержку
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'create_support_message', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const userId = (session.user as any).id;

    // Rate limiting - максимум 20 сообщений в поддержку в минуту
    if (!checkRateLimit(`support:${userId}`, 20, 60000)) {
      logSecurityEvent('rate_limit', { action: 'create_support_message', userId });
      return NextResponse.json(
        { error: 'Слишком много сообщений. Подождите минуту' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { subject, message, attachment, attachmentType } = body;

    // Валидация
    if (!subject || !message) {
      logSecurityEvent('invalid_input', { action: 'create_support_message', userId, reason: 'missing_fields' });
      return NextResponse.json(
        { error: 'Тема и сообщение обязательны' },
        { status: 400 }
      );
    }

    // Санитизация текста (защита от XSS)
    const sanitizedSubject = sanitizeString(subject);
    const sanitizedMessage = sanitizeString(message);

    const supportMessage = await prisma.supportMessage.create({
      data: {
        userId,
        senderId: userId,
        subject: sanitizedSubject,
        message: sanitizedMessage,
        attachment,
        attachmentType
      } as any,
      include: {
        user: true,
        sender: true
      }
    });

    return NextResponse.json(supportMessage);
  } catch (error) {
    console.error('Ошибка создания сообщения в поддержку:', error);
    return NextResponse.json(
      { error: 'Ошибка создания сообщения в поддержку' },
      { status: 500 }
    );
  }
}

// GET /api/support - получить все сообщения в поддержку (только для админов)
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      logSecurityEvent('access_denied', { 
        action: 'get_all_support_messages', 
        reason: 'not_admin',
        userId: (session?.user as any)?.id 
      });
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const supportMessages = await prisma.supportMessage.findMany({
      include: {
        user: true,
        sender: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(supportMessages);
  } catch (error) {
    console.error('Ошибка получения сообщений в поддержку:', error);
    return NextResponse.json(
      { error: 'Ошибка получения сообщений в поддержку' },
      { status: 500 }
    );
  }
}