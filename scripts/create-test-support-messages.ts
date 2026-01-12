import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestSupportMessages() {
  try {
    console.log('Создание тестовых сообщений поддержки...');

    // Находим пользователя и админа
    const user = await prisma.user.findUnique({
      where: { email: 'user@example.com' }
    });

    const admin = await prisma.user.findUnique({
      where: { email: 'admin@gulyaly.com' }
    });

    if (!user) {
      console.log('Пользователь не найден, создаем...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newUser = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: hashedPassword,
          name: 'Тестовый Пользователь',
          role: 'USER'
        }
      });
      console.log('Пользователь создан:', newUser.email);
    }

    if (!admin) {
      console.log('Админ не найден, создаем...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@gulyaly.com',
          password: hashedPassword,
          name: 'Администратор',
          role: 'ADMIN'
        }
      });
      console.log('Админ создан:', newAdmin.email);
    }

    // Получаем обновленные данные
    const finalUser = await prisma.user.findUnique({
      where: { email: 'user@example.com' }
    });

    const finalAdmin = await prisma.user.findUnique({
      where: { email: 'admin@gulyaly.com' }
    });

    if (!finalUser || !finalAdmin) {
      console.error('Не удалось найти пользователя или админа');
      return;
    }

    // Удаляем старые тестовые сообщения
    await prisma.supportMessage.deleteMany({
      where: {
        OR: [
          { userId: finalUser.id },
          { userId: finalAdmin.id }
        ]
      }
    });

    console.log('Создание тестовых сообщений...');

    // Создаем сообщение от клиента
    const clientMessage1 = await prisma.supportMessage.create({
      data: {
        userId: finalUser.id,
        subject: 'Вопрос о продукте',
        message: 'Здравствуйте! Подскажите, пожалуйста, как работает доставка цифровых продуктов?',
        status: 'READ'
      },
      include: { user: true }
    });
    console.log('Создано сообщение от клиента:', clientMessage1.id);

    // Создаем ответ от админа (ВАЖНО: userId = клиент, чтобы сообщение было видно клиенту)
    const adminReply1 = await prisma.supportMessage.create({
      data: {
        userId: finalUser.id, // Сообщение с userId клиента, чтобы клиент его видел
        subject: '[Админ] Ответ на вопрос о доставке',
        message: 'Здравствуйте! Цифровые продукты доставляются мгновенно после оплаты. Вы получите доступ сразу после успешной оплаты.',
        status: 'REPLIED'
      },
      include: { user: true }
    });
    console.log('Создан ответ от админа:', adminReply1.id);

    // Еще одно сообщение от клиента
    const clientMessage2 = await prisma.supportMessage.create({
      data: {
        userId: finalUser.id,
        subject: 'Благодарность',
        message: 'Спасибо за быстрый ответ! Все понятно.',
        status: 'REPLIED'
      },
      include: { user: true }
    });
    console.log('Создано второе сообщение от клиента:', clientMessage2.id);

    console.log('\n✅ Тестовые сообщения успешно созданы!');
    console.log('Клиент:', finalUser.email);
    console.log('Админ:', finalAdmin.email);
    console.log('Всего сообщений: 3');

  } catch (error) {
    console.error('Ошибка при создании тестовых сообщений:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSupportMessages();

