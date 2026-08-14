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
