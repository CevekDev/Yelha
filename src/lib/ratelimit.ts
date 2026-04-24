import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

let redis: Redis | null = null;

export function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

export const authRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'ratelimit:auth',
});

export const apiRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api',
});

/** Strict per-email rate limit for 2FA verification — prevents multi-IP brute force */
export const twoFARatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(10, '30 m'),
  analytics: true,
  prefix: 'ratelimit:2fa:email',
});

export function getRateLimitKey(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous';
  return `ip:${ip}`;
}
