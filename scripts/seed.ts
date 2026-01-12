import { prisma } from '../lib/prisma';

async function seedDatabase() {
  try {
    console.log('Запуск заполнения базы данных тестовыми данными...');
    
    // Удаляем все существующие продукты и связанные данные
    await prisma.order.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.product.deleteMany({});

    // Создаем 10 тестовых продуктов
    const products = [
      {
        name: 'Цифровой букет роз',
        description: 'Красивый цифровой букет из 10 красных роз',
        image: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1500382017250-6d0c6b6c0d8a?w=800&h=800&fit=crop'],
        variants: [
          { name: '1 роза', price: 10000, description: 'Одна красная роза' },
          { name: '10 роз', price: 90000, description: 'Букет из 10 роз' },
          { name: '50 роз', price: 400000, description: 'Большой букет из 50 роз' },
        ]
      },
      {
        name: 'Цифровой подарок другу',
        description: 'Подарок для лучшего друга на день рождения',
        image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1533134486753-c833bf3a3d8d?w=800&h=800&fit=crop'],
        variants: [
          { name: 'Стандарт', price: 50000, description: 'Стандартный подарок' },
          { name: 'Премиум', price: 150000, description: 'Расширенный подарок' },
        ]
      },
      {
        name: 'Цифровая открытка',
        description: 'Красивая цифровая открытка для ваших близких',
        image: 'https://images.unsplash.com/photo-1543269865-cbf4ce699dc6?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1543269865-cbf4ce699dc6?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=800&fit=crop'],
        variants: [
          { name: 'Обычная', price: 20000, description: 'Простая открытка' },
          { name: 'Анимированная', price: 50000, description: 'Открытка с анимацией' },
        ]
      },
      {
        name: 'Цифровой торт',
        description: 'Виртуальный торт для празднования дня рождения',
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1563170351-be939b90e303?w=800&h=800&fit=crop'],
        variants: [
          { name: 'Маленький', price: 30000, description: 'Торт на 1-2 человека' },
          { name: 'Большой', price: 80000, description: 'Торт на компанию до 10 человек' },
        ]
      },
      {
        name: 'Цифровые цветы',
        description: 'Разноцветные цифровые цветы для любого случая',
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1490822487888-5f4df8ac130c?w=800&h=800&fit=crop'],
        variants: [
          { name: 'Микс', price: 150000, description: 'Смешанный букет из разных цветов' },
          { name: 'Только тюльпаны', price: 120000, description: 'Букет из тюльпанов' },
        ]
      },
      {
        name: 'Цифровой подарочный набор',
        description: 'Комплект цифровых подарков для любимого человека',
        image: 'https://images.unsplash.com/photo-1542662565-7e4e66d9d6c1?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1542662565-7e4e66d9d6c1?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1533134486753-c833bf3a3d8d?w=800&h=800&fit=crop'],
        variants: [
          { name: 'Стандарт', price: 200000, description: 'Стандартный набор' },
          { name: 'Премиум', price: 350000, description: 'Расширенный набор' },
        ]
      },
      {
        name: 'Цифровые шары',
        description: 'Яркие цифровые воздушные шары для праздника',
        image: 'https://images.unsplash.com/photo-1588836363908-06e6a0b7ff2b?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1588836363908-06e6a0b7ff2b?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1583391261101-1a277d7dc6bc?w=800&h=800&fit=crop'],
        variants: [
          { name: '5 шаров', price: 25000, description: 'Набор из 5 шаров' },
          { name: '20 шаров', price: 80000, description: 'Большой набор из 20 шаров' },
        ]
      },
      {
        name: 'Цифровой подарок для мамы',
        description: 'Трогательный цифровой подарок для мамы',
        image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1529338296731-34c8e41373cc?w=800&h=800&fit=crop'],
        variants: [
          { name: 'Маме', price: 100000, description: 'Подарок специально для мамы' },
          { name: 'Маме и папе', price: 180000, description: 'Подарок для родителей' },
        ]
      },
      {
        name: 'Цифровой салют',
        description: 'Яркий цифровой салют для празднования',
        image: 'https://images.unsplash.com/photo-1511561203929-09245661077a?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1511561203929-09245661077a?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1506350023083-0b6a064d1c88?w=800&h=800&fit=crop'],
        variants: [
          { name: 'Короткий', price: 40000, description: 'Короткий салют' },
          { name: 'Длинный', price: 100000, description: 'Продолжительный салют' },
        ]
      },
      {
        name: 'Цифровой подарок любимому',
        description: 'Любовный цифровой подарок для вашего партнера',
        image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=800&fit=crop',
        images: ['https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=800&h=800&fit=crop'],
        variants: [
          { name: 'С любовью', price: 150000, description: 'Подарок с признаниями в любви' },
          { name: 'Юбилей', price: 250000, description: 'Подарок ко дню свадьбы' },
        ]
      }
    ];

    for (const productData of products) {
      const product = await prisma.product.create({
        data: {
          name: productData.name,
          description: productData.description,
          image: productData.image,
          images: { set: productData.images },
          variants: {
            create: productData.variants
          }
        }
      });
      console.log(`Создан продукт: ${product.name}`);
    }

    console.log('База данных успешно заполнена тестовыми данными!');
  } catch (error) {
    console.error('Ошибка при заполнении базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();