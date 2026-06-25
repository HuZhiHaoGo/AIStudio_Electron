import { prisma } from './prismaClient';

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

export async function closeDatabaseConnection() {
  await prisma.$disconnect();
}
