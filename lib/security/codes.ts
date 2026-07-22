// Códigos 2FA por e-mail — hasheados, uso único, expiração 5min, máx 5 tentativas
import { redis } from "@/lib/db/redis";
import { sha256, randomToken, generateLoginCode } from "./crypto";
import type { RequestInfo } from "./request-info";

export const CODE_TTL_SECONDS = 5 * 60;
export const MAX_CODE_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

export interface PendingLogin {
  userId: string;
  role: string;
  codeHash: string;
  attempts: number;
  createdAt: string;
  lastSentAt: string;
  ip: string;
  device: string;
  status: "pending" | "used";
}

const PENDING_KEY = (id: string) => `crm:login-code:${id}`;
const USER_PENDING_KEY = (userId: string) => `crm:login-code-user:${userId}`;

/** Cria um pending login + código. Invalida qualquer código anterior do usuário. */
export async function createPendingLogin(
  userId: string,
  role: string,
  info: RequestInfo
): Promise<{ pendingId: string; code: string }> {
  // invalida o anterior
  const prev = await redis.get<string>(USER_PENDING_KEY(userId));
  if (prev) await redis.del(PENDING_KEY(prev));

  const pendingId = randomToken();
  const code = generateLoginCode();
  const now = new Date().toISOString();
  const record: PendingLogin = {
    userId, role,
    codeHash: sha256(code),
    attempts: 0,
    createdAt: now,
    lastSentAt: now,
    ip: info.ip,
    device: `${info.device} · ${info.os} · ${info.browser}`,
    status: "pending",
  };
  await redis.set(PENDING_KEY(pendingId), record, { ex: CODE_TTL_SECONDS });
  await redis.set(USER_PENDING_KEY(userId), pendingId, { ex: CODE_TTL_SECONDS });
  return { pendingId, code };
}

export async function getPendingLogin(pendingId: string): Promise<PendingLogin | null> {
  return redis.get<PendingLogin>(PENDING_KEY(pendingId));
}

export type VerifyResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; reason: "expired" | "invalid" | "locked" | "used"; attemptsLeft?: number };

export async function verifyLoginCode(pendingId: string, code: string): Promise<VerifyResult> {
  const record = await getPendingLogin(pendingId);
  if (!record) return { ok: false, reason: "expired" };
  if (record.status === "used") return { ok: false, reason: "used" };
  if (record.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: "locked" };

  if (sha256(code.trim()) !== record.codeHash) {
    record.attempts += 1;
    const locked = record.attempts >= MAX_CODE_ATTEMPTS;
    await redis.set(PENDING_KEY(pendingId), record, { ex: CODE_TTL_SECONDS });
    if (locked) return { ok: false, reason: "locked" };
    return { ok: false, reason: "invalid", attemptsLeft: MAX_CODE_ATTEMPTS - record.attempts };
  }

  // uso único
  record.status = "used";
  await redis.del(PENDING_KEY(pendingId));
  await redis.del(USER_PENDING_KEY(record.userId));
  return { ok: true, userId: record.userId, role: record.role };
}

/** Reenvia: gera novo código no MESMO pendingId, respeitando cooldown de 60s. */
export async function resendLoginCode(pendingId: string): Promise<{ code: string } | { error: "cooldown" | "expired"; waitSeconds?: number }> {
  const record = await getPendingLogin(pendingId);
  if (!record || record.status === "used") return { error: "expired" };
  const elapsed = (Date.now() - new Date(record.lastSentAt).getTime()) / 1000;
  if (elapsed < RESEND_COOLDOWN_SECONDS) {
    return { error: "cooldown", waitSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed) };
  }
  const code = generateLoginCode();
  record.codeHash = sha256(code);
  record.attempts = 0;
  record.lastSentAt = new Date().toISOString();
  await redis.set(PENDING_KEY(pendingId), record, { ex: CODE_TTL_SECONDS });
  return { code };
}
