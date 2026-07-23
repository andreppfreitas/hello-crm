import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { dbGetAllUsers, dbGetUser, dbSaveUser, hashPassword, type DBUser } from "@/lib/db/users-db";

async function getSessionUser(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return null;
  return dbGetUser(session.userId);
}

export async function GET(request: NextRequest) {
  const me = await getSessionUser(request);
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await dbGetAllUsers();
  return NextResponse.json({ users: users.map(({ passwordHash: _, ...u }) => u) });
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser(request);
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { username, displayName, password, role, office } = await request.json();
  if (!username || !displayName || !password) return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
  const newUser: DBUser = {
    id: `user_${Date.now()}`,
    username: username.toLowerCase(),
    displayName,
    passwordHash: hashPassword(password),
    role: role ?? "consultant",
    office: office ?? undefined,
    createdAt: new Date().toISOString(),
  };
  await dbSaveUser(newUser);
  return NextResponse.json({ success: true, id: newUser.id });
}
