import { NextRequest, NextResponse } from "next/server";
import { dbGetUser, dbEnsureUsersSeeded } from "@/lib/db/users-db";
import { requireSession } from "@/lib/security/auth";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  await dbEnsureUsersSeeded();
  const user = await dbGetUser(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
}
