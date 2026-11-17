import http from 'http';
import { app } from './app.js';
import { config } from './config/env.js';
import { prisma, checkDatabaseConnection } from './config/prisma.js';
import { checkRedisConnection, getRedisClient } from './config/redis.js';
import { initSocketIO } from './services/socket.service.js';
import { initQueues } from './services/queue.service.js';

const httpServer = http.createServer(app);

// Initialize Socket.IO real-time engine
initSocketIO(httpServer);

// Initialize BullMQ Queues and asynchronous workers
initQueues();

const server = httpServer.listen(config.port, async () => {
  console.log(`\n======================================================`);
  console.log(`🏥 IoMT Privacy-Aware RPM Backend Server Started`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🩺 Health Endpoint: http://localhost:${config.port}/api/health`);
  console.log(`⚡ WebSocket Engine: Socket.IO initialized`);
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

  // Verify Redis connection on startup
  const redisStatus = await checkRedisConnection();
  if (redisStatus.connected) {
    console.log(`✅ [Cache/Queue] Redis & BullMQ connected successfully (${redisStatus.latencyMs}ms).`);
  } else {
    console.warn(`⚠️  [Cache/Queue] Redis not reachable (${redisStatus.error}). Fallback to synchronous mode active.`);
  }
});

// Graceful Shutdown
async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      const redis = getRedisClient();
      if (redis) await redis.quit();
      console.log('Redis client disconnected.');
    } catch (_) {}
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
