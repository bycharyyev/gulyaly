import { prisma } from './prisma';

// Хранилище сессий пользователей в памяти (для разработки)
// В продакшене лучше использовать Redis или базу данных
const userSessions = new Map<string, { userId: string; authTime: number }>();

// Проверка аутентификации пользователя
export async function authenticateTelegramUser(userId: string, password: string): Promise<boolean> {
  try {
    // Ищем пользователя в базе данных через Prisma
    const user = await prisma.user.findFirst({
      where: { id: userId, role: 'ADMIN' },
      select: { id: true },
    });

    if (!user) {
      return false;
    }

    // Проверяем пароль
    const adminPassword = process.env.TELEGRAM_ADMIN_PASSWORD || 'admin123';
    
    if (password === adminPassword) {
      userSessions.set(userId.toString(), {
        userId: user.id,
        authTime: Date.now()
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Telegram auth error:', error);
    return false;
  }
}

// Проверка авторизован ли пользователь
export function isTelegramAuthorized(userId: string): boolean {
  const session = userSessions.get(userId.toString());
  
  if (!session) {
    return false;
  }

  // Проверяем не истекла ли сессия (24 часа)
  const isExpired = Date.now() - session.authTime > 24 * 60 * 60 * 1000;
  
  if (isExpired) {
    userSessions.delete(userId.toString());
    return false;
  }

  return true;
}

// Очистка сессии (logout)
export function logoutTelegramUser(userId: string): void {
  userSessions.delete(userId.toString());
}

// Получение ID администратора для Telegram
export async function getTelegramAdminId(): Promise<string | null> {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    return admin?.id || null;
  } catch (error) {
    console.error('Error getting admin ID:', error);
    return null;
  }
}
