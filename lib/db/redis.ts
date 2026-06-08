import { Redis } from "@upstash/redis";

// Singleton — reuse across hot reloads in dev
const globalForRedis = globalThis as unknown as { _redis?: Redis };

export const redis =
  globalForRedis._redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

if (process.env.NODE_ENV !== "production") globalForRedis._redis = redis;
