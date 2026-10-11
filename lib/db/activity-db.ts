import { redis } from "./redis";
import type { ActivityEntry } from "@/types";

const ACTIVITY_KEY = "crm:activity:log";
const MAX_ENTRIES = 500;

export async function dbLogActivity(entry: ActivityEntry): Promise<void> {
  await redis.lpush(ACTIVITY_KEY, JSON.stringify(entry));
  // Keep only the most recent MAX_ENTRIES
  await redis.ltrim(ACTIVITY_KEY, 0, MAX_ENTRIES - 1);
}

export async function dbGetActivityLog(limit = 100): Promise<ActivityEntry[]> {
  const raw = await redis.lrange(ACTIVITY_KEY, 0, limit - 1);
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r)) as ActivityEntry[];
}

// ── Custom templates ───────────────────────────────────────────────────────────
import type { CustomTemplate } from "@/types";

const TEMPLATES_KEY = "crm:custom:templates";

export async function dbGetCustomTemplates(): Promise<CustomTemplate[]> {
  const data = await redis.get<CustomTemplate[]>(TEMPLATES_KEY);
  return data ?? [];
}

export async function dbSaveCustomTemplates(templates: CustomTemplate[]): Promise<void> {
  await redis.set(TEMPLATES_KEY, templates);
}

// ── Passos do processo por etapa (sobrescrevem TASK_TEMPLATES) ─────────────────

const STEPS_KEY = "crm:custom:stage-steps";

/** Mapa etapa → lista de passos. Só guarda as etapas que foram customizadas. */
export async function dbGetStageSteps(): Promise<Record<string, string[]>> {
  const data = await redis.get<Record<string, string[]>>(STEPS_KEY);
  return data ?? {};
}

export async function dbSaveStageSteps(steps: Record<string, string[]>): Promise<void> {
  await redis.set(STEPS_KEY, steps);
}

// ── Cotações ──────────────────────────────────────────────────────────────────

import type { Quotation } from "@/types/quotation";

const QUOTE_KEY = (id: string) => `crm:quotation:${id}`;
const QUOTE_IDS = "crm:quotation:ids";
const QUOTE_BY_TOKEN = (token: string) => `crm:quotation:token:${token}`;
const QUOTE_SEQ = "crm:quotation:seq";

export async function dbNextQuotationSeq(): Promise<number> {
  return redis.incr(QUOTE_SEQ);
}

export async function dbSaveQuotation(q: Quotation): Promise<void> {
  await redis.set(QUOTE_KEY(q.id), q);
  await redis.sadd(QUOTE_IDS, q.id);
  // Índice do link público: token → id, para o aluno abrir sem login
  await redis.set(QUOTE_BY_TOKEN(q.publicToken), q.id);
}

export async function dbGetQuotation(id: string): Promise<Quotation | null> {
  return redis.get<Quotation>(QUOTE_KEY(id));
}

export async function dbGetQuotationByToken(token: string): Promise<Quotation | null> {
  const id = await redis.get<string>(QUOTE_BY_TOKEN(token));
  return id ? dbGetQuotation(id) : null;
}

export async function dbGetQuotationsByLead(leadId: string): Promise<Quotation[]> {
  const ids = await redis.smembers(QUOTE_IDS);
  if (!ids.length) return [];
  const all = await Promise.all(ids.map((id) => dbGetQuotation(id)));
  return (all.filter(Boolean) as Quotation[])
    .filter((q) => q.leadId === leadId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function dbDeleteQuotation(q: Quotation): Promise<void> {
  await redis.del(QUOTE_KEY(q.id));
  await redis.del(QUOTE_BY_TOKEN(q.publicToken));
  await redis.srem(QUOTE_IDS, q.id);
}

// ── Logos lembrados por escola/seguradora ─────────────────────────────────────
// O logo automático falha com frequência (muita escola não publica favicon
// decente). Quando o consultor cola a URL uma vez, fica guardada e volta
// sozinha nas próximas cotações daquela escola.

import { normalizeBrandName } from "@/lib/brand-registry";

const LOGOS_KEY = "crm:brand:logos";

export async function dbGetRememberedLogos(): Promise<Record<string, string>> {
  return (await redis.get<Record<string, string>>(LOGOS_KEY)) ?? {};
}

export async function dbRememberLogo(name: string, url: string): Promise<void> {
  const chave = normalizeBrandName(name);
  if (!chave || !url) return;
  const atual = await dbGetRememberedLogos();
  if (atual[chave] === url) return;
  await redis.set(LOGOS_KEY, { ...atual, [chave]: url });
}

export async function dbLookupLogo(name: string | undefined): Promise<string | undefined> {
  if (!name?.trim()) return undefined;
  return (await dbGetRememberedLogos())[normalizeBrandName(name)];
}
