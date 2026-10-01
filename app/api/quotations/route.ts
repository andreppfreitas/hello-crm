import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { dbGetUser } from "@/lib/db/users-db";
import { dbGetLead } from "@/lib/db/leads-db";
import { dbSaveQuotation, dbGetQuotationsByLead, dbNextQuotationSeq } from "@/lib/db/activity-db";
import { randomToken } from "@/lib/security/crypto";
import { formatQuotationNumber } from "@/lib/quotation";
import type { Quotation } from "@/types/quotation";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const leadId = new URL(request.url).searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId obrigatório" }, { status: 400 });
  return NextResponse.json({ quotations: await dbGetQuotationsByLead(leadId) });
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const me = await dbGetUser(session.userId);

  const body = await request.json().catch(() => null);
  const leadId = String(body?.leadId ?? "");
  const lead = leadId ? await dbGetLead(leadId) : null;
  if (!lead) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const now = new Date().toISOString();
  // Validade padrão de 7 dias — cotação de escola envelhece rápido
  const validade = new Date();
  validade.setDate(validade.getDate() + 7);

  const quotation: Quotation = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    leadId,
    number: formatQuotationNumber(await dbNextQuotationSeq()),
    packageName: String(body?.packageName ?? "").trim() || "Proposta de estudo",
    city: String(body?.city ?? lead.preferredCity ?? lead.currentCity ?? "Austrália"),
    currency: "AUD",
    courses: Array.isArray(body?.courses) ? body.courses : [],
    costGroups: Array.isArray(body?.costGroups) ? body.costGroups : [],
    schedule: Array.isArray(body?.schedule) ? body.schedule : [],
    sourceNumber: body?.sourceNumber ? String(body.sourceNumber) : undefined,
    importantNote: body?.importantNote ? String(body.importantNote) : undefined,
    validUntil: String(body?.validUntil ?? validade.toISOString().slice(0, 10)),
    status: "draft",
    publicToken: randomToken(),
    sourceFileName: body?.sourceFileName ? String(body.sourceFileName) : undefined,
    createdBy: me?.displayName ?? "Sistema",
    createdAt: now,
    updatedAt: now,
  };

  await dbSaveQuotation(quotation);
  return NextResponse.json({ quotation });
}
