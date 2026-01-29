import { prisma } from './prisma';

// Хранилище сессий пользователей в памяти (для разработки)
// В продакшене лучше использовать Redis или базу данных
const userSessions = new Map<string, { userId: string; authTime: number }>();

// Проверка аутентификации пользователя
export async function authenticateTelegramUser(userId: string, password: string): Promise<boolean> {
  try {
    // Ищем пользователя в базе данных
    const user = await prisma.$queryRawUnsafe(`
      SELECT id, role FROM users WHERE id = ? AND role = 'ADMIN'
    `, userId) as any[];

    if (user.length === 0) {
      return false;
    }

    // Проверяем пароль (можно использовать системный пароль или env)
    const adminPassword = process.env.TELEGRAM_ADMIN_PASSWORD || 'admin123';
    
    if (password === adminPassword) {
      // Сохраняем сессию на 24 часа
      userSessions.set(userId.toString(), {
        userId: user[0].id,
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
    const admin = await prisma.$queryRawUnsafe(`
      SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1
    `) as any[];

    return admin.length > 0 ? admin[0].id : null;
  } catch (error) {
    console.error('Error getting admin ID:', error);
    return null;
  }
}
