// Универсальные хелперы для API routes

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';

/**
 * Проверка аутентификации пользователя
 * Возвращает session или error response
 */
export async function requireAuth() {
  const session = await auth();
  
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    };
  }
  
  return { session, error: null };
}

/**
 * Проверка админских прав
 * Возвращает session или error response
 */
export async function requireAdmin() {
  const { session, error } = await requireAuth();
  
  if (error) {
    return { session: null, error };
  }
  
  if ((session.user as any).role !== 'ADMIN') {
    logSecurityEvent('access_denied', { 
      action: 'admin_access', 
      userId: (session.user as any).id,
      reason: 'not_admin' 
    });
    
    return {
      session: null,
      error: NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    };
  }
  
  return { session, error: null };
}

/**
 * Универсальный обработчик ошибок API
 */
export function handleApiError(error: any, context: string) {
  logSecurityEvent('api_error', { context, error: error.message });
  
  console.error(`[API Error] ${context}:`, error);
  
  return NextResponse.json(
    { error: 'Внутренняя ошибка сервера' },
    { status: 500 }
  );
}

/**
 * Валидация ID параметра
 */
export function validateId(id: string, paramName: string = 'id') {
  if (!id || typeof id !== 'string' || id.length > 255) {
    return {
      isValid: false,
      error: NextResponse.json(
        { error: `Неверный параметр ${paramName}` },
        { status: 400 }
      )
    };
  }
  
  return { isValid: true, error: null };
}

/**
 * Успешный ответ API
 */
export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    message,
    data
  });
}

/**
 * Стандартный ответ с пагинацией
 */
export function paginatedResponse<T>(
  data: T[], 
  page: number, 
  limit: number, 
  total: number
) {
  const totalPages = Math.ceil(total / limit);
  
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}
