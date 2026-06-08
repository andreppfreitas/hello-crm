import { redis } from "./redis";
import crypto from "crypto";

export interface DBUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: "admin" | "consultant";
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
  const count = await dbUsersCount();
  if (count > 0) return;
  const seedUsers: DBUser[] = [
    {
      id: "andre",
      username: "andreperez",
      displayName: "André Perez",
      passwordHash: hashPassword(process.env.AUTH_PASS_ANDRE ?? "hello2025"),
      role: "admin",
      createdAt: new Date().toISOString(),
    },
    {
      id: "andrew",
      username: "andrew",
      displayName: "Andrew Oliveira",
      passwordHash: hashPassword(process.env.AUTH_PASS_ANDREW ?? "hello2025"),
      role: "consultant",
      createdAt: new Date().toISOString(),
    },
  ];
  await Promise.all(seedUsers.map(dbSaveUser));
}
