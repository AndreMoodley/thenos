import { PrismaClient } from '@prisma/client';

// Single client instance across the process.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});
