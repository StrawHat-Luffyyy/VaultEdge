import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Creates an ioredis client.
 * Works with both local Redis and Upstash (via TCP proxy).
 */
export function createRedisClient(url?: string): Redis {
  const redis = new Redis(url ?? env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    lazyConnect: true,
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  redis.on('error', (err) => {
    logger.error({ err }, 'Redis error');
  });

  return redis;
}

// Singleton instances
let cacheRedis: Redis | null = null;
let queueRedis: Redis | null = null;

export function getCacheRedis(): Redis {
  if (!cacheRedis) {
    cacheRedis = createRedisClient(env.REDIS_URL);
  }
  return cacheRedis;
}

export function getQueueRedis(): Redis {
  if (!queueRedis) {
    queueRedis = createRedisClient(env.BULLMQ_REDIS_URL);
  }
  return queueRedis;
}

export async function disconnectRedis(): Promise<void> {
  const disconnects: Promise<string>[] = [];
  if (cacheRedis) disconnects.push(cacheRedis.quit());
  if (queueRedis) disconnects.push(queueRedis.quit());
  await Promise.all(disconnects);
  cacheRedis = null;
  queueRedis = null;
}
