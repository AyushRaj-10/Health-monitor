import { Router } from 'express';
import { checkDatabaseConnection } from '../config/prisma.js';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res, next) => {
  try {
    const dbStatus = await checkDatabaseConnection();
    const uptimeSeconds = Math.floor(process.uptime());
    const memory = process.memoryUsage();

    const isHealthy = dbStatus.connected;

    const response = {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'Privacy-Aware Remote Patient Monitoring System API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        formatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      },
      database: {
        status: dbStatus.connected ? 'connected' : 'disconnected',
        provider: 'PostgreSQL (Prisma)',
        latency: dbStatus.latencyMs ? `${dbStatus.latencyMs}ms` : null,
        ...(dbStatus.error && { message: 'Database service not currently responding. Check PostgreSQL service & credentials.' }),
      },
      edgeSubsystem: {
        status: 'ready',
        architecture: 'Decentralized IoMT Edge Gateway',
        differentialPrivacyEngine: 'active',
        anonymizationMode: 'k-anonymity (k=5)',
      },
      environment: process.env.NODE_ENV || 'development',
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMb: {
          rss: Math.round(memory.rss / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        },
      },
    };

    // Return 200 even if degraded so monitoring tools receive the structured diagnostic JSON
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});
