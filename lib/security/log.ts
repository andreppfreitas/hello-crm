// Log de eventos de segurança por usuário (últimos 100 no Redis)
import { redis } from "@/lib/db/redis";
import type { RequestInfo } from "./request-info";
import { maskIP } from "./request-info";

export type SecurityEventType =
  | "login"
  | "logout"
  | "password_changed"
  | "code_sent"
  | "code_validated"
  | "code_invalid"
  | "code_expired"
  | "session_revoked"
  | "session_created"
  | "invalid_attempt"
  | "account_locked"
  | "trusted_device_added";

export const EVENT_LABELS: Record<SecurityEventType, string> = {
  login: "Login realizado",
  logout: "Logout",
  password_changed: "Senha alterada",
  code_sent: "Código enviado",
  code_validated: "Código validado",
  code_invalid: "Código inválido",
  code_expired: "Código expirado",
  session_revoked: "Sessão encerrada",
  session_created: "Nova sessão criada",
  invalid_attempt: "Tentativa inválida",
  account_locked: "Conta bloqueada temporariamente",
  trusted_device_added: "Dispositivo confiável adicionado",
};

export interface SecurityEvent {
  type: SecurityEventType;
  at: string;
  city: string;
  country: string;
  device: string;
  browser: string;
  ip: string; // já mascarado
  result: "ok" | "fail";
}

const LOG_KEY = (userId: string) => `crm:seclog:${userId}`;

export async function logSecurityEvent(
  userId: string,
  type: SecurityEventType,
  info: RequestInfo,
  result: "ok" | "fail" = "ok"
): Promise<void> {
  const event: SecurityEvent = {
    type,
    at: new Date().toISOString(),
    city: info.city,
    country: info.country,
    device: `${info.device} · ${info.os}`,
    browser: info.browser,
    ip: maskIP(info.ip),
    result,
  };
  await redis.lpush(LOG_KEY(userId), JSON.stringify(event));
  await redis.ltrim(LOG_KEY(userId), 0, 99);
}

export async function getSecurityLog(userId: string, limit = 20): Promise<SecurityEvent[]> {
  const raw = await redis.lrange(LOG_KEY(userId), 0, limit - 1);
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r) as SecurityEvent);
}
