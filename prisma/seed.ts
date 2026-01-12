import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Начинаем заполнение базы данных...');

  // Создаем пользователей
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gulyaly.com' },
    update: {},
    create: {
      email: 'admin@gulyaly.com',
      password: hashedPassword,
      name: 'Администратор',
      role: 'ADMIN',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: hashedPassword,
      name: 'Тестовый пользователь',
      role: 'USER',
    },
  });

  console.log('✅ Пользователи созданы');

  // Создаем продукты с вариантами
  const product1 = await prisma.product.create({
    data: {
      name: 'Букет роз',
      description: 'Красивый цифровой букет роз для вашего любимого человека',
      isActive: true,
      variants: {
        create: [
          {
            name: '1 роза',
            price: 100 * 100, // в копейках
            description: 'Одна красная роза',
          },
          {
            name: '10 роз',
            price: 900 * 100,
            description: 'Букет из 10 красных роз',
          },
          {
            name: '50 роз',
            price: 4000 * 100,
            description: 'Большой букет из 50 роз',
          },
        ],
      },
    },
    include: { variants: true },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Цифровая открытка',
      description: 'Поздравительная цифровая открытка с индивидуальным дизайном',
      isActive: true,
      variants: {
        create: [
          {
            name: 'Стандартная',
            price: 50 * 100,
            description: 'Базовый дизайн',
          },
          {
            name: 'Премиум',
            price: 150 * 100,
            description: 'Премиум дизайн с анимацией',
          },
        ],
      },
    },
    include: { variants: true },
  });

  console.log('✅ Продукты созданы');

  // Создаем тестовые заказы
  await prisma.order.create({
    data: {
      userId: user.id,
      productId: product1.id,
      variantId: product1.variants[1].id, // 10 роз
      amount: product1.variants[1].price,
      status: 'COMPLETED',
    },
  });

  await prisma.order.create({
    data: {
      userId: user.id,
      productId: product2.id,
      variantId: product2.variants[0].id, // Стандартная открытка
      amount: product2.variants[0].price,
      status: 'PENDING',
    },
  });

  console.log('✅ Заказы созданы');

  // Создаем сообщения поддержки
  await prisma.supportMessage.create({
    data: {
      userId: user.id,
      subject: 'Вопрос о доставке',
      message: 'Здравствуйте! Как быстро приходит цифровой продукт после оплаты?',
      status: 'NEW',
    },
  });

  console.log('✅ Сообщения поддержки созданы');

  console.log('🎉 База данных успешно заполнена!');
  console.log('\nТестовые аккаунты:');
  console.log('Админ: admin@gulyaly.com / password123');
  console.log('Пользователь: user@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
