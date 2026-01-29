const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function showUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        phoneVerified: true,
        createdAt: true,
        otp: true,
        otpExpiresAt: true
      },
      take: 10
    });
    
    console.log('📋 Пользователи в базе данных:');
    console.log('================================');
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ID: ${user.id}`);
      console.log(`   Имя: ${user.name || 'Не указано'}`);
      console.log(`   Телефон: ${user.phone || 'Не указан'}`);
      console.log(`   Email: ${user.email || 'Не указан'}`);
      console.log(`   Роль: ${user.role}`);
      console.log(`   Телефон подтвержден: ${user.phoneVerified ? 'Да' : 'Нет'}`);
      console.log(`   OTP: ${user.otp || 'Нет'}`);
      console.log(`   OTP истекает: ${user.otpExpiresAt || 'Нет'}`);
      console.log(`   Создан: ${user.createdAt.toLocaleString('ru-RU')}`);
    });
    
    console.log(`\n📊 Всего пользователей: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка при получении пользователей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showUsers();
