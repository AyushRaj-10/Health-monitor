import Redis from 'ioredis';
import { config } from './env.js';

let redisClient = null;
let isConnected = false;
let lastError = null;

/**
 * Initialize or retrieve the singleton Redis client.
 * Configured with BullMQ compatibility (maxRetriesPerRequest: null).
 */
export function getRedisClient() {
  if (!redisClient) {
    try {
      redisClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
          // Exponential backoff with a cap of 5 seconds
          const delay = Math.min(times * 200, 5000);
          return delay;
        },
        reconnectOnError(err) {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
        lazyConnect: false,
      });

      redisClient.on('connect', () => {
        isConnected = true;
        lastError = null;
      });

      redisClient.on('ready', () => {
        isConnected = true;
        lastError = null;
      });

      redisClient.on('error', (err) => {
        isConnected = false;
        lastError = err.message;
        // Suppress unhandled crash by listening to error event
      });

      redisClient.on('close', () => {
        isConnected = false;
      });
    } catch (err) {
      isConnected = false;
      lastError = err.message;
    }
  }

  return redisClient;
}

/**
 * Diagnostic health-check probe for Redis.
 * Measures round-trip ping latency.
 */
export async function checkRedisConnection() {
  const client = getRedisClient();
  const startTime = Date.now();

  try {
    if (!client) {
      return { connected: false, latencyMs: null, error: 'Redis client not initialized' };
    }
    const pong = await client.ping();
    const latencyMs = Date.now() - startTime;
    return {
      connected: pong === 'PONG',
      latencyMs,
      error: null,
    };
  } catch (error) {
    return {
      connected: false,
      latencyMs: null,
      error: error.message || 'Unable to connect to Redis',
    };
  }
}
