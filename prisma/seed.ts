import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin
  const adminPassword = await hash('admin123!', 12);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create Seller (APPROVED)
  const sellerPassword = await hash('seller123!', 12);
  const seller = await prisma.seller.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: {
      email: 'seller@example.com',
      passwordHash: sellerPassword,
      name: 'Test Seller',
      role: 'SELLER',
      sellerStatus: 'APPROVED',
      businessName: 'Test Store',
      isActive: true,
    },
  });
  console.log('✅ Seller created:', seller.email);

  // Create Seller (PENDING)
  const pendingSeller = await prisma.seller.upsert({
    where: { email: 'pending@example.com' },
    update: {},
    create: {
      email: 'pending@example.com',
      passwordHash: sellerPassword,
      name: 'Pending Seller',
      role: 'SELLER',
      sellerStatus: 'PENDING',
      businessName: 'Pending Store',
      isActive: true,
    },
  });
  console.log('✅ Pending Seller created:', pendingSeller.email);

  // Create User
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Test User',
      phone: '+79001234567',
      role: 'USER',
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });
  console.log('✅ User created:', user.email);

  console.log('\n🔑 Login Credentials:');
  console.log('Admin:    admin@example.com / admin123!');
  console.log('Seller:   seller@example.com / seller123!');
  console.log('Pending:  pending@example.com / seller123!');
  console.log('User:     user@example.com (OTP login)');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
