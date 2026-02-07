// ============================================================
// SEED INITIAL ADMIN
// Run: npx ts-node scripts/seed-admin.ts
// ============================================================

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial admin...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'SecurePass123!';

  // Hash password
  const passwordHash = await hash(adminPassword, 12);

  // Create or update admin
  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin created/updated:', {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });

  console.log('\n🔑 Login credentials:');
  console.log('Email:', adminEmail);
  console.log('Password:', adminPassword);
  console.log('\n⚠️  Change the default password in production!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
