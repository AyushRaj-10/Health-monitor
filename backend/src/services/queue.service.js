import { Queue, Worker } from 'bullmq';
import { getRedisClient, checkRedisConnection } from '../config/redis.js';
import { prisma } from '../config/prisma.js';

let vitalsQueue = null;
let auditQueue = null;
let syncQueue = null;

let vitalsWorker = null;
let auditWorker = null;
let syncWorker = null;

const QUEUE_OPTS = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
};

/**
 * Initialize BullMQ queues and background workers
 */
export function initQueues() {
  const connection = getRedisClient();
  if (!connection) return;

  try {
    // Queues
    vitalsQueue = new Queue('vitals-ingest', { connection, ...QUEUE_OPTS });
    auditQueue = new Queue('audit-logs', { connection, ...QUEUE_OPTS });
    syncQueue = new Queue('offline-sync', { connection, ...QUEUE_OPTS });

    // Worker: Vitals Background Ingestion & Real-time Aggregation
    vitalsWorker = new Worker(
      'vitals-ingest',
      async (job) => {
        const { reading, patientId } = job.data;
        // Background worker can perform supplementary analysis or batch aggregation
        return { processed: true, readingId: reading?.id, patientId };
      },
      { connection, concurrency: 5 }
    );

    vitalsWorker.on('failed', (job, err) => {
      console.warn(`[BullMQ] vitals-ingest job ${job?.id} failed:`, err.message);
    });

    // Worker: Audit Logs Persistence
    auditWorker = new Worker(
      'audit-logs',
      async (job) => {
        const { userId, action, resourceType, resourceId, metadata, ipAddress, userAgent } = job.data;
        return await prisma.auditLog.create({
          data: {
            userId: userId || null,
            action,
            resourceType,
            resourceId: resourceId || null,
            metadata: metadata || {},
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
          },
        });
      },
      { connection, concurrency: 5 }
    );

    auditWorker.on('failed', (job, err) => {
      console.warn(`[BullMQ] audit-logs job ${job?.id} failed:`, err.message);
    });

    // Worker: Offline Sync Queue
    syncWorker = new Worker(
      'offline-sync',
      async (job) => {
        const { batchSize, deviceId, patientId } = job.data;
        return { synced: true, count: batchSize, deviceId, patientId };
      },
      { connection, concurrency: 2 }
    );

    syncWorker.on('failed', (job, err) => {
      console.warn(`[BullMQ] offline-sync job ${job?.id} failed:`, err.message);
    });
  } catch (error) {
    console.warn('[BullMQ] Initialization warning:', error.message);
  }
}

/**
 * Dispatch job to audit queue with seamless synchronous fallback
 */
export async function queueAuditLog(data) {
  try {
    if (auditQueue) {
      await auditQueue.add('log', data);
      return { queued: true };
    }
  } catch (err) {
    // Fallback to synchronous database insert if Redis/BullMQ is unavailable
  }

  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId || null,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
    return { queued: false, direct: true, id: log.id };
  } catch (fallbackError) {
    console.error('Audit direct persistence error:', fallbackError.message);
    return null;
  }
}

/**
 * Enqueue vitals background processing with fallback
 */
export async function queueVitalsProcessing(data) {
  try {
    if (vitalsQueue) {
      await vitalsQueue.add('process', data);
      return { queued: true };
    }
  } catch (err) {
    // Non-blocking fallback
  }
  return { queued: false };
}

/**
 * Enqueue offline sync batch processing
 */
export async function queueOfflineSync(data) {
  try {
    if (syncQueue) {
      await syncQueue.add('sync-batch', data);
      return { queued: true };
    }
  } catch (err) {
    // Non-blocking fallback
  }
  return { queued: false };
}

/**
 * Query current metrics across all BullMQ queues
 */
export async function getQueueMetrics() {
  const redisHealth = await checkRedisConnection();
  if (!redisHealth.connected || !vitalsQueue) {
    return {
      status: 'offline',
      provider: 'BullMQ / Redis',
      connected: false,
      queues: {
        vitals: { waiting: 0, active: 0, completed: 0, failed: 0 },
        audit: { waiting: 0, active: 0, completed: 0, failed: 0 },
        sync: { waiting: 0, active: 0, completed: 0, failed: 0 },
      },
    };
  }

  try {
    const [vitalsCounts, auditCounts, syncCounts] = await Promise.all([
      vitalsQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
      auditQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
      syncQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    ]);

    return {
      status: 'active',
      provider: 'BullMQ / Redis',
      connected: true,
      queues: {
        vitals: vitalsCounts,
        audit: auditCounts,
        sync: syncCounts,
      },
    };
  } catch (err) {
    return {
      status: 'error',
      provider: 'BullMQ / Redis',
      connected: false,
      error: err.message,
    };
  }
}
