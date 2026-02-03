import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: process.env.DATABASE_URL,
  });

// Production connection pooling settings
if (process.env.NODE_ENV === 'production') {
  // Prisma uses PgBouncer-compatible connection pooling by default
  // For manual pool sizing, use environment variables:
  // - DATABASE_URL already includes pool settings if using PgBouncer
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
