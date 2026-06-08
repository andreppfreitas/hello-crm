import type { Lead } from "@/types";
import { redis } from "./redis";

const LEADS_SET = "crm:leads:ids";
const leadKey = (id: string) => `crm:lead:${id}`;

export async function dbGetAllLeads(): Promise<Lead[]> {
  const ids = await redis.smembers(LEADS_SET);
  if (!ids.length) return [];

  const pipeline = redis.pipeline();
  ids.forEach((id) => pipeline.get(leadKey(id)));
  const results = await pipeline.exec<(Lead | null)[]>();

  return results
    .filter((r): r is Lead => r !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function dbGetLead(id: string): Promise<Lead | null> {
  return redis.get<Lead>(leadKey(id));
}

export async function dbSaveLead(lead: Lead): Promise<void> {
  await Promise.all([
    redis.set(leadKey(lead.id), lead),
    redis.sadd(LEADS_SET, lead.id),
  ]);
}

export async function dbDeleteLead(id: string): Promise<void> {
  await Promise.all([
    redis.del(leadKey(id)),
    redis.srem(LEADS_SET, id),
  ]);
}

export async function dbLeadsCount(): Promise<number> {
  return redis.scard(LEADS_SET);
}
