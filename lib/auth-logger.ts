// Логирование событий авторизации
export function logAuthEvent(
  event: 'login' | 'logout' | 'access_denied' | 'unauthorized',
  details: {
    userId?: string;
    email?: string;
    role?: string;
    path?: string;
    ip?: string;
  }
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    ...details,
  };

  // В продакшене можно отправлять в external logging service
  console.log('[AUTH]', JSON.stringify(logEntry));
  
  // TODO: Сохранять в БД для аудита
  // await prisma.authLog.create({ data: logEntry });
}

export function logApiAccess(
  method: string,
  path: string,
  userId?: string,
  success: boolean = true,
  statusCode?: number
) {
  const timestamp = new Date().toISOString();
  console.log('[API]', JSON.stringify({
    timestamp,
    method,
    path,
    userId,
    success,
    statusCode,
  }));
}
