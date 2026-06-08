import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { dbGetUser, dbEnsureUsersSeeded } from "@/lib/db/users-db";

export async function GET(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const [userId] = session.split(":");
  await dbEnsureUsersSeeded();
  const user = await dbGetUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
}
