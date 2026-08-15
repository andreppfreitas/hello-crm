import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { dbGetUser, dbGetAllUsers } from "@/lib/db/users-db";
import { dbGetAllLeads, dbSaveLead } from "@/lib/db/leads-db";
import { dbGetAllReminders, dbSaveReminder } from "@/lib/db/reminders-db";
import {
  dbGetActivityLog, dbGetCustomTemplates, dbSaveCustomTemplates,
  dbGetStageSteps, dbSaveStageSteps,
} from "@/lib/db/activity-db";
import type { Lead, Reminder } from "@/types";

export const BACKUP_VERSION = 1;

async function requireAdmin(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return null;
  const me = await dbGetUser(session.userId);
  return me?.role === "admin" ? me : null;
}

/** Snapshot completo do sistema, em JSON. */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [leads, reminders, users, templates, stageSteps, activity] = await Promise.all([
    dbGetAllLeads(),
    dbGetAllReminders(),
    dbGetAllUsers(),
    dbGetCustomTemplates(),
    dbGetStageSteps(),
    dbGetActivityLog(500),
  ]);

  const backup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: { leads: leads.length, reminders: reminders.length, users: users.length },
    leads,
    reminders,
    // Sem passwordHash: um backup não é lugar para credencial
    users: users.map(({ passwordHash: _drop, ...u }) => u),
    templates,
    stageSteps,
    activity,
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="hello-crm-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

/**
 * Restauração. Só adiciona e sobrescreve por id — nunca apaga.
 * Um registro que existe hoje e não está no backup permanece intacto, então
 * restaurar um arquivo antigo não destrói o que veio depois dele.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  }
  if (body.version !== BACKUP_VERSION) {
    return NextResponse.json(
      { error: `Backup na versão ${body.version ?? "desconhecida"}; esperado ${BACKUP_VERSION}` },
      { status: 400 }
    );
  }

  const leads: Lead[] = Array.isArray(body.leads) ? body.leads : [];
  const reminders: Reminder[] = Array.isArray(body.reminders) ? body.reminders : [];
  const valid = <T extends { id?: unknown }>(rows: T[]) => rows.filter((r) => typeof r?.id === "string" && r.id);

  const okLeads = valid(leads);
  const okReminders = valid(reminders);

  await Promise.all(okLeads.map(dbSaveLead));
  await Promise.all(okReminders.map(dbSaveReminder));
  if (Array.isArray(body.templates)) await dbSaveCustomTemplates(body.templates);
  if (body.stageSteps && typeof body.stageSteps === "object") await dbSaveStageSteps(body.stageSteps);

  return NextResponse.json({
    success: true,
    restored: {
      leads: okLeads.length,
      reminders: okReminders.length,
      ignorados: (leads.length - okLeads.length) + (reminders.length - okReminders.length),
    },
  });
}
