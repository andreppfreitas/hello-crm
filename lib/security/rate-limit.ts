// Rate limit simples via Redis INCR + EXPIRE
import { redis } from "@/lib/db/redis";

const KEY = (bucket: string, id: string) => `crm:rl:${bucket}:${id}`;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Permite `max` hits por `windowSeconds` no bucket/id. */
export async function rateLimit(bucket: string, id: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  const key = KEY(bucket, id);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  const ttl = count > max ? await redis.ttl(key) : 0;
  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    retryAfterSeconds: Math.max(0, ttl),
  };
}

/** Bloqueio temporário explícito (ex.: conta após 5 códigos errados). */
export async function lockAccount(userId: string, seconds: number): Promise<void> {
  await redis.set(`crm:lock:${userId}`, "1", { ex: seconds });
}

export async function isAccountLocked(userId: string): Promise<number> {
  const ttl = await redis.ttl(`crm:lock:${userId}`);
  return ttl > 0 ? ttl : 0;
}
