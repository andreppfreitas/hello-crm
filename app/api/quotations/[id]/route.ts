import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { dbGetQuotation, dbSaveQuotation, dbDeleteQuotation } from "@/lib/db/activity-db";
import type { Quotation } from "@/types/quotation";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const q = await dbGetQuotation((await params).id);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ quotation: q });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await dbGetQuotation((await params).id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Partial<Quotation> = await request.json().catch(() => ({}));
  // id, token, número, autoria e vínculo com o aluno não se editam pela API
  const { id: _i, publicToken: _t, number: _n, leadId: _l, createdAt: _c, createdBy: _b, ...safe } = data;

  const updated: Quotation = { ...existing, ...safe, updatedAt: new Date().toISOString() };
  await dbSaveQuotation(updated);
  return NextResponse.json({ quotation: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const q = await dbGetQuotation((await params).id);
  if (q) await dbDeleteQuotation(q);
  return NextResponse.json({ success: true });
}
