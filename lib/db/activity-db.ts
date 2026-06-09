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
