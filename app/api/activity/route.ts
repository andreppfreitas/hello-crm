import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { dbGetUser } from "@/lib/db/users-db";
import { dbGetActivityLog, dbLogActivity } from "@/lib/db/activity-db";
import type { ActivityEntry } from "@/types";

async function getSessionUser(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  const [userId] = session.split(":");
  return dbGetUser(userId);
}

export async function GET(request: NextRequest) {
  const me = await getSessionUser(request);
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
  const log = await dbGetActivityLog(limit);
  return NextResponse.json({ log });
}

export async function POST(request: NextRequest) {
  // Called internally from other API routes — no auth check needed (server-side)
  const entry: ActivityEntry = await request.json();
  await dbLogActivity(entry);
  return NextResponse.json({ ok: true });
}
