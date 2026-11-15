import { app } from './app.js';
import { config } from './config/env.js';
import { prisma, checkDatabaseConnection } from './config/prisma.js';

const server = app.listen(config.port, async () => {
  console.log(`\n======================================================`);
  console.log(`🏥 IoMT Privacy-Aware RPM Backend Server Started`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🩺 Health Endpoint: http://localhost:${config.port}/api/health`);
  console.log(`🌱 Environment: ${config.nodeEnv}`);
  console.log(`======================================================\n`);

  // Verify DB connection on startup
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    console.log(`✅ [Database] PostgreSQL connected successfully via Prisma (${dbStatus.latencyMs}ms).`);
  } else {
    console.warn(`⚠️  [Database] PostgreSQL not connected: ${dbStatus.error}`);
    console.warn(`👉 To start PostgreSQL using Docker: docker compose up -d`);
    console.warn(`👉 Or configure DATABASE_URL in backend/.env to match your local PostgreSQL.`);
  }
});

// Graceful Shutdown
async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Prisma database client disconnected.');
    process.exit(0);
  });

  // Force shutdown after 10s if hanging
  setTimeout(() => {
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
