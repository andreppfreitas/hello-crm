import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { dbGetUser } from "@/lib/db/users-db";
import { dbGetStageSteps, dbSaveStageSteps } from "@/lib/db/activity-db";
import { STAGE_CONFIG } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({ steps: await dbGetStageSteps() });
}

export async function PUT(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const me = await dbGetUser(session.userId);
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const stage = String(body?.stage ?? "");
  const steps = body?.steps;
  if (!(stage in STAGE_CONFIG)) {
    return NextResponse.json({ error: "Etapa desconhecida" }, { status: 400 });
  }
  if (!Array.isArray(steps) || steps.some((s) => typeof s !== "string")) {
    return NextResponse.json({ error: "Passos inválidos" }, { status: 400 });
  }
  const clean = steps.map((s: string) => s.trim()).filter(Boolean).slice(0, 12);

  const all = await dbGetStageSteps();
  if (clean.length === 0) delete all[stage];   // vazio = volta ao padrão
  else all[stage] = clean;
  await dbSaveStageSteps(all);
  return NextResponse.json({ success: true, steps: clean });
}
