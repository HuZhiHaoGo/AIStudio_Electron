import dotenv from 'dotenv';
import { PrismaClient } from '../node_modules/.prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

dotenv.config();

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function databaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('请先在 .env 中配置 DATABASE_URL。');
  }

  return url;
}

const adapter = new PrismaMssql(databaseUrl());

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

export async function closeDatabaseConnection() {
  await prisma.$disconnect();
}
