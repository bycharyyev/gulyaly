// Simple in-memory rate limiter
// В продакшене используйте Redis или другое решение

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000 // 1 минута
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Если записи нет или время истекло - создаем новую
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true, remaining: limit - 1 };
  }

  // Проверяем лимит
  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  // Увеличиваем счетчик
  record.count++;
  return { success: true, remaining: limit - record.count };
}

// Очистка старых записей каждые 5 минут
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
