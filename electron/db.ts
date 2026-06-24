import dotenv from 'dotenv';
import { PrismaClient } from '../node_modules/.prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

dotenv.config();

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// 读取数据库连接字符串。Prisma 连接 SQL Server 时必须依赖 DATABASE_URL。
function databaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('请先在 .env 中配置 DATABASE_URL。');
  }

  return url;
}

// Prisma 7 需要显式传入 SQL Server driver adapter，这里把 .env 中的连接串交给适配器。
const adapter = new PrismaMssql(databaseUrl());

// 创建 Prisma Client。开发环境下复用全局实例，避免热重载时反复创建数据库连接。
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 用一条最简单的 SQL 检查数据库是否能连通。
export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

// 应用退出或测试结束时主动关闭数据库连接。
export async function closeDatabaseConnection() {
  await prisma.$disconnect();
}
