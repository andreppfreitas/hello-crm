import type { Reminder } from "@/types";
import { redis } from "./redis";

const REMINDERS_SET = "crm:reminders:ids";
const reminderKey = (id: string) => `crm:reminder:${id}`;

export async function dbGetAllReminders(): Promise<Reminder[]> {
  const ids = await redis.smembers(REMINDERS_SET);
  if (!ids.length) return [];

  const pipeline = redis.pipeline();
  ids.forEach((id) => pipeline.get(reminderKey(id)));
  const results = await pipeline.exec<(Reminder | null)[]>();

  return results
    .filter((r): r is Reminder => r !== null)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export async function dbSaveReminder(reminder: Reminder): Promise<void> {
  await Promise.all([
    redis.set(reminderKey(reminder.id), reminder),
    redis.sadd(REMINDERS_SET, reminder.id),
  ]);
}

export async function dbDeleteReminder(id: string): Promise<void> {
  await Promise.all([
    redis.del(reminderKey(id)),
    redis.srem(REMINDERS_SET, id),
  ]);
}
