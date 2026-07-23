import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { dbGetUser } from "@/lib/db/users-db";
import { dbGetActivityLog, dbLogActivity } from "@/lib/db/activity-db";
import type { ActivityEntry } from "@/types";

async function getSessionUser(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return null;
  return dbGetUser(session.userId);
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
