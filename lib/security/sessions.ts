// Sessões server-side no Redis — cookie carrega só um token opaco
import { redis } from "@/lib/db/redis";
import { sha256, randomToken } from "./crypto";
import type { RequestInfo } from "./request-info";

export interface SessionRecord {
  id: string;          // sha256 do token — chave pública da sessão
  userId: string;
  role: string;
  ip: string;
  city: string;
  country: string;
  browser: string;
  os: string;
  device: string;
  createdAt: string;
  lastSeenAt: string;
}

export const SESSION_TTL = 60 * 60 * 24 * 7; // 7 dias

const KEY = (id: string) => `crm:session:${id}`;
const USER_SESSIONS = (userId: string) => `crm:user-sessions:${userId}`;

export async function createSession(userId: string, role: string, info: RequestInfo): Promise<string> {
  const token = randomToken();
  const id = sha256(token);
  const now = new Date().toISOString();
  const record: SessionRecord = {
    id, userId, role,
    ip: info.ip, city: info.city, country: info.country,
    browser: info.browser, os: info.os, device: info.device,
    createdAt: now, lastSeenAt: now,
  };
  await redis.set(KEY(id), record, { ex: SESSION_TTL });
  await redis.sadd(USER_SESSIONS(userId), id);
  return token;
}

export async function getSession(token: string): Promise<SessionRecord | null> {
  if (!token) return null;
  return redis.get<SessionRecord>(KEY(sha256(token)));
}

export async function touchSession(record: SessionRecord): Promise<void> {
  record.lastSeenAt = new Date().toISOString();
  await redis.set(KEY(record.id), record, { ex: SESSION_TTL });
}

export async function revokeSessionById(userId: string, sessionId: string): Promise<void> {
  await redis.del(KEY(sessionId));
  await redis.srem(USER_SESSIONS(userId), sessionId);
}

export async function revokeOtherSessions(userId: string, keepSessionId: string): Promise<number> {
  const ids = await redis.smembers(USER_SESSIONS(userId));
  const others = ids.filter((id) => id !== keepSessionId);
  if (others.length) {
    await Promise.all(others.map((id) => redis.del(KEY(id))));
    await Promise.all(others.map((id) => redis.srem(USER_SESSIONS(userId), id)));
  }
  return others.length;
}

export async function listSessions(userId: string): Promise<SessionRecord[]> {
  const ids = await redis.smembers(USER_SESSIONS(userId));
  if (!ids.length) return [];
  const records = await Promise.all(ids.map((id) => redis.get<SessionRecord>(KEY(id))));
  // limpa ids de sessões já expiradas do set
  const dead = ids.filter((_, i) => !records[i]);
  if (dead.length) await Promise.all(dead.map((id) => redis.srem(USER_SESSIONS(userId), id)));
  return (records.filter(Boolean) as SessionRecord[]).sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
  );
}
