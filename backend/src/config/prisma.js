import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/**
 * Checks connectivity to the PostgreSQL database via Prisma.
 * @returns {Promise<{ connected: boolean, latencyMs?: number, error?: string }>}
 */
export async function checkDatabaseConnection() {
  const startTime = Date.now();
  try {
    // Perform a lightweight query to test connectivity
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;
    return {
      connected: true,
      latencyMs,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message || 'Unable to connect to PostgreSQL database',
    };
  }
}
