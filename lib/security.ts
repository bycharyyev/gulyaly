// Утилиты безопасности

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Проверка авторизации пользователя
 * Возвращает session или null
 */
export async function requireAuth() {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }
  
  return session;
}

/**
 * Проверка админских прав
 * Возвращает error response если не админ
 */
export async function requireAdmin() {
  const session = await requireAuth();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 }
    );
  }
  
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Требуются права администратора' },
      { status: 403 }
    );
  }
  
  return null; // Нет ошибки - пользователь админ
}

/**
 * Санитизация строк для предотвращения XSS
 */
export function sanitizeString(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Валидация номера телефона (E.164)
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // E.164 формат: +[country code][number]
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Валидация email
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Rate limiting helper
 * Проверяет количество запросов от пользователя
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000 // 1 минута
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false; // Превышен лимит
  }
  
  record.count++;
  return true;
}

/**
 * Очистка старых записей rate limit (вызывать периодически)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetAt) {
      requestCounts.delete(key);
    }
  }
}

// Автоматическая очистка каждые 5 минут
setInterval(cleanupRateLimits, 5 * 60 * 1000);

/**
 * Генерация безопасного случайного токена
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    token += chars[randomIndex];
  }
  
  return token;
}

/**
 * Проверка силы пароля
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Пароль должен быть минимум 8 символов');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Пароль должен содержать строчные буквы');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Пароль должен содержать заглавные буквы');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Пароль должен содержать цифры');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Логирование событий безопасности
 */
export function logSecurityEvent(
  event: 'login' | 'logout' | 'access_denied' | 'rate_limit' | 'invalid_input',
  details: Record<string, any>
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };
  
  // В production отправлять в logging service (Sentry, CloudWatch и т.д.)
  console.log('[SECURITY]', JSON.stringify(logEntry));
}
