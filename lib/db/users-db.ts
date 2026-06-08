import { redis } from "./redis";
import crypto from "crypto";

export type OfficeCity = "Sydney" | "Melbourne" | "Brisbane" | "Gold Coast" | "Perth" | "Adelaide";

export interface DBUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: "admin" | "consultant";
  office?: OfficeCity;
  createdAt: string;
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "hello_crm_salt_2025").digest("hex");
}

export function checkPassword(plain: string, hash: string): boolean {
  return hashPassword(plain) === hash;
}

export { hashPassword };

const USERS_KEY = "crm:users:ids";
const USER_KEY = (id: string) => `crm:user:${id}`;
const SEED_VERSION_KEY = "crm:seed:users:version";
const SEED_VERSION = "v3"; // bump this to force re-seed/migrate

// Canonical seeded users — always upserted when version mismatches
const SEED_USERS: DBUser[] = [
  {
    id: "andre",
    username: "sydney3@hellostudy.com",
    displayName: "André Perez",
    passwordHash: hashPassword("Rpcabb06"),
    role: "admin",
    office: "Sydney",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "andrew",
    username: "andrew.oliveira@hellostudy.com",
    displayName: "Andrew Oliveira",
    passwordHash: hashPassword("Voc05261"),
    role: "consultant",
    office: "Sydney",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "rafael",
    username: "rafael.jacobsen@hellostudy.com",
    displayName: "Rafael Jacobsen",
    passwordHash: hashPassword("Voc05261"),
    role: "admin",
    office: "Sydney",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

export async function dbGetAllUsers(): Promise<DBUser[]> {
  const ids = await redis.smembers(USERS_KEY);
  if (!ids.length) return [];
  const users = await Promise.all(ids.map((id) => redis.get<DBUser>(USER_KEY(id))));
  return users.filter(Boolean) as DBUser[];
}

export async function dbGetUserByUsername(username: string): Promise<DBUser | null> {
  const all = await dbGetAllUsers();
  return all.find((u) => u.username === username.toLowerCase()) ?? null;
}

export async function dbGetUser(id: string): Promise<DBUser | null> {
  return redis.get<DBUser>(USER_KEY(id));
}

export async function dbSaveUser(user: DBUser): Promise<void> {
  await redis.sadd(USERS_KEY, user.id);
  await redis.set(USER_KEY(user.id), user);
}

export async function dbDeleteUser(id: string): Promise<void> {
  await redis.srem(USERS_KEY, id);
  await redis.del(USER_KEY(id));
}

export async function dbUsersCount(): Promise<number> {
  return redis.scard(USERS_KEY);
}

export async function dbEnsureUsersSeeded(): Promise<void> {
  const version = await redis.get<string>(SEED_VERSION_KEY);
  if (version === SEED_VERSION) return; // already up to date

  // Upsert canonical seed users (preserves any extra users created by admin)
  await Promise.all(SEED_USERS.map(dbSaveUser));
  await redis.set(SEED_VERSION_KEY, SEED_VERSION);
}
