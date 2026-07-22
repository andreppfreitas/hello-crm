// Dispositivos confiáveis — cookie com token opaco, hash no Redis, 30 dias
import { redis } from "@/lib/db/redis";
import { sha256, randomToken } from "./crypto";
import type { RequestInfo } from "./request-info";

export const TRUSTED_COOKIE = "hello_crm_trusted";
export const TRUSTED_TTL = 60 * 60 * 24 * 30; // 30 dias

interface TrustedDevice {
  userId: string;
  browser: string;
  os: string;
  country: string;
  createdAt: string;
}

const KEY = (hash: string) => `crm:trusted:${hash}`;
const USER_KEY = (userId: string) => `crm:trusted-user:${userId}`;

export async function trustDevice(userId: string, info: RequestInfo): Promise<string> {
  const token = randomToken();
  const hash = sha256(token);
  const record: TrustedDevice = {
    userId,
    browser: info.browser,
    os: info.os,
    country: info.country,
    createdAt: new Date().toISOString(),
  };
  await redis.set(KEY(hash), record, { ex: TRUSTED_TTL });
  await redis.sadd(USER_KEY(userId), hash);
  return token;
}

/**
 * Dispositivo é confiável se o token bate E o contexto não mudou drasticamente
 * (novo navegador ou novo país exigem código de novo).
 */
export async function isTrustedDevice(token: string | undefined, userId: string, info: RequestInfo): Promise<boolean> {
  if (!token) return false;
  const record = await redis.get<TrustedDevice>(KEY(sha256(token)));
  if (!record || record.userId !== userId) return false;
  if (record.browser !== info.browser) return false;
  if (record.country !== "—" && info.country !== "—" && record.country !== info.country) return false;
  return true;
}

/** Revoga todos os dispositivos confiáveis do usuário (ex.: após troca de senha). */
export async function revokeTrustedDevices(userId: string): Promise<void> {
  const hashes = await redis.smembers(USER_KEY(userId));
  if (hashes.length) await Promise.all(hashes.map((h) => redis.del(KEY(h))));
  await redis.del(USER_KEY(userId));
}
