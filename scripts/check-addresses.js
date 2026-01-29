const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAddresses() {
  try {
    console.log('🔍 Проверяем таблицу addresses...');
    
    // Проверяем существует ли таблица addresses
    try {
      const addresses = await prisma.$queryRaw`SELECT * FROM addresses`;
      console.log('✅ Таблица addresses существует');
      console.log('📍 Адресов в базе:', addresses.length);
      
      if (addresses.length > 0) {
        addresses.forEach((addr, index) => {
          console.log(`\n${index + 1}. ID: ${addr.id}`);
          console.log(`   Пользователь: ${addr.userId}`);
          console.log(`   Название: ${addr.title}`);
          console.log(`   Адрес: ${addr.street}, ${addr.house}`);
          console.log(`   Основной: ${addr.isDefault ? 'Да' : 'Нет'}`);
        });
      } else {
        console.log('📭 Адресов пока нет');
      }
    } catch (error) {
      console.log('❌ Ошибка при доступе к таблице addresses:', error.message);
      
      // Проверяем структуру базы
      console.log('\n🔍 Проверяем схему базы...');
      const result = await prisma.$queryRaw`SELECT sql FROM sqlite_master WHERE type='table' AND name='addresses'`;
      if (result.length > 0) {
        console.log('✅ Таблица addresses найдена в схеме:');
        console.log(result[0].sql);
      } else {
        console.log('❌ Таблица addresses не найдена в схеме');
      }
    }
    
  } catch (error) {
    console.error('💥 Общая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAddresses();
