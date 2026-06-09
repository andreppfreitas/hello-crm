import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { dbGetUser } from "@/lib/db/users-db";
import { dbGetCustomTemplates, dbSaveCustomTemplates } from "@/lib/db/activity-db";
import type { CustomTemplate } from "@/types";

async function getSessionUser(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  const [userId] = session.split(":");
  return dbGetUser(userId);
}

export async function GET() {
  const templates = await dbGetCustomTemplates();
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser(request);
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { label, channel, subject, body } = await request.json();
  if (!label || !channel || !body) return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
  const templates = await dbGetCustomTemplates();
  const newTemplate: CustomTemplate = {
    id: `tpl_${Date.now()}`,
    label,
    channel,
    subject: subject || undefined,
    body,
    createdAt: new Date().toISOString(),
  };
  await dbSaveCustomTemplates([...templates, newTemplate]);
  return NextResponse.json({ template: newTemplate });
}

export async function PUT(request: NextRequest) {
  const me = await getSessionUser(request);
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, label, channel, subject, body } = await request.json();
  const templates = await dbGetCustomTemplates();
  const updated = templates.map((t) =>
    t.id === id ? { ...t, label, channel, subject: subject || undefined, body } : t
  );
  await dbSaveCustomTemplates(updated);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const me = await getSessionUser(request);
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await request.json();
  const templates = await dbGetCustomTemplates();
  await dbSaveCustomTemplates(templates.filter((t) => t.id !== id));
  return NextResponse.json({ ok: true });
}
