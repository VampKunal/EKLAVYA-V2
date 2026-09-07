import { Redis } from '@upstash/redis';

/**
 * Singleton Redis client.
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
 *
 * Add these to .env.local:
 *   UPSTASH_REDIS_REST_URL=https://...
 *   UPSTASH_REDIS_REST_TOKEN=...
 *
 * Get them free at: https://console.upstash.com
 */
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Redis not configured — caller must handle gracefully (fall back to in-memory)
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

/** Cache TTL constants (seconds) */
export const TTL = {
  USER_DASHBOARD: 5 * 60,   // 5 minutes — user progress / weak topics
  RECOMMENDATIONS: 10 * 60, // 10 minutes — AI recommendations
  COURSE_LIST: 60 * 60,     // 1 hour — course metadata
} as const;
