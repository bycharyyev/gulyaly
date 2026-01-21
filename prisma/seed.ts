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
  const productsData = [
    {
      name: 'Букет роз',
      description: 'Красивый цифровой букет роз для вашего любимого человека',
      isActive: true,
      variants: [
        { name: '1 роза', price: 100 * 100, description: 'Одна красная роза' },
        { name: '10 роз', price: 900 * 100, description: 'Букет из 10 красных роз' },
        { name: '50 роз', price: 4000 * 100, description: 'Большой букет из 50 роз' },
      ],
    },
    {
      name: 'Цифровая открытка',
      description: 'Поздравительная цифровая открытка с индивидуальным дизайном',
      isActive: true,
      variants: [
        { name: 'Стандартная', price: 50 * 100, description: 'Базовый дизайн' },
        { name: 'Премиум', price: 150 * 100, description: 'Премиум дизайн с анимацией' },
        { name: 'VIP', price: 300 * 100, description: 'Эксклюзивный дизайн с видео' },
      ],
    },
    {
      name: 'Подписка на музыку',
      description: 'Доступ к миллионам треков без рекламы',
      isActive: true,
      variants: [
        { name: '1 месяц', price: 299 * 100, description: 'Подписка на 1 месяц' },
        { name: '3 месяца', price: 799 * 100, description: 'Подписка на 3 месяца' },
        { name: '12 месяцев', price: 2499 * 100, description: 'Годовая подписка' },
      ],
    },
    {
      name: 'Электронная книга',
      description: 'Популярные электронные книги в формате PDF и EPUB',
      isActive: true,
      variants: [
        { name: 'Бестселлер', price: 250 * 100, description: 'Топовая книга месяца' },
        { name: 'Классика', price: 150 * 100, description: 'Классическая литература' },
        { name: 'Новинка', price: 350 * 100, description: 'Новая книга автора' },
      ],
    },
    {
      name: 'Онлайн-курс',
      description: 'Профессиональный онлайн-курс с сертификатом',
      isActive: true,
      variants: [
        { name: 'Базовый', price: 1500 * 100, description: 'Основы программирования' },
        { name: 'Продвинутый', price: 3500 * 100, description: 'Углубленное изучение' },
        { name: 'Мастер-класс', price: 7500 * 100, description: 'Экспертный уровень' },
      ],
    },
    {
      name: 'Видеоигра',
      description: 'Цифровая копия популярной видеоигры',
      isActive: true,
      variants: [
        { name: 'Стандартное издание', price: 1999 * 100, description: 'Базовая версия игры' },
        { name: 'Делюкс издание', price: 2999 * 100, description: 'С дополнениями' },
        { name: 'Ultimate издание', price: 4999 * 100, description: 'Полное издание' },
      ],
    },
    {
      name: 'Фотобанк',
      description: 'Доступ к стоковым фотографиям высокого качества',
      isActive: true,
      variants: [
        { name: '10 изображений', price: 500 * 100, description: 'Пакет из 10 фото' },
        { name: '50 изображений', price: 2000 * 100, description: 'Пакет из 50 фото' },
        { name: 'Безлимит', price: 5000 * 100, description: 'Неограниченный доступ на месяц' },
      ],
    },
    {
      name: 'Софт для дизайна',
      description: 'Профессиональное ПО для графического дизайна',
      isActive: true,
      variants: [
        { name: 'Лицензия на месяц', price: 999 * 100, description: 'Месячная подписка' },
        { name: 'Лицензия на год', price: 9999 * 100, description: 'Годовая подписка' },
        { name: 'Бессрочная', price: 29999 * 100, description: 'Навсегда' },
      ],
    },
    {
      name: 'Виртуальный подарок',
      description: 'Цифровой подарочный сертификат',
      isActive: true,
      variants: [
        { name: '500 рублей', price: 500 * 100, description: 'Сертификат на 500₽' },
        { name: '1000 рублей', price: 1000 * 100, description: 'Сертификат на 1000₽' },
        { name: '5000 рублей', price: 5000 * 100, description: 'Сертификат на 5000₽' },
      ],
    },
    {
      name: 'Шаблоны для сайта',
      description: 'Готовые шаблоны для создания сайтов',
      isActive: true,
      variants: [
        { name: 'Один шаблон', price: 799 * 100, description: 'Единичный шаблон' },
        { name: 'Пакет из 5', price: 2999 * 100, description: '5 шаблонов' },
        { name: 'Все шаблоны', price: 9999 * 100, description: 'Полная коллекция' },
      ],
    },
  ];

  const createdProducts = [];
  for (const productData of productsData) {
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        description: productData.description,
        isActive: productData.isActive,
        variants: {
          create: productData.variants,
        },
      },
      include: { variants: true },
    });
    createdProducts.push(product);
  }

  console.log('✅ Продукты созданы');

  // Создаем тестовые заказы
  await prisma.order.create({
    data: {
      userId: user.id,
      productId: createdProducts[0].id,
      variantId: createdProducts[0].variants[1].id,
      amount: createdProducts[0].variants[1].price,
      status: 'COMPLETED',
    },
  });

  await prisma.order.create({
    data: {
      userId: user.id,
      productId: createdProducts[1].id,
      variantId: createdProducts[1].variants[0].id,
      amount: createdProducts[1].variants[0].price,
      status: 'PENDING',
    },
  });

  await prisma.order.create({
    data: {
      userId: user.id,
      productId: createdProducts[2].id,
      variantId: createdProducts[2].variants[0].id,
      amount: createdProducts[2].variants[0].price,
      status: 'PAID',
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
  console.log(`\n✅ Создано ${createdProducts.length} продуктов`);
  console.log(`\n🎯 Тестовые аккаунты:`);
  console.log('👤 Админ: admin@gulyaly.com / password123');
  console.log('👤 Пользователь: user@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
