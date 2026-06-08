import { NextRequest, NextResponse } from "next/server";
import { dbGetLead, dbSaveLead, dbDeleteLead } from "@/lib/db/leads-db";
import type { Lead } from "@/types";
import { CONSULTANTS } from "@/lib/constants";
import type { PipelineStage, StageChangeEvent } from "@/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await dbGetLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const existing = await dbGetLead(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: Partial<Lead> = await request.json();
    const now = new Date().toISOString();

    let updated: Lead = { ...existing, ...data, updatedAt: now };

    // Track stage changes
    if (data.stage && data.stage !== existing.stage) {
      const change: StageChangeEvent = {
        id: `sc-${Date.now()}`,
        fromStage: existing.stage,
        toStage: data.stage,
        changedAt: now,
        changedBy: data.assignedConsultant ?? CONSULTANTS[0],
      };
      updated.stageChanges = [change, ...(existing.stageChanges ?? [])];
      updated.stageHistory = existing.stageHistory.map((h) =>
        h.stage === existing.stage && !h.exitedAt ? { ...h, exitedAt: now } : h
      );
      updated.stageHistory = [...updated.stageHistory, { stage: data.stage as PipelineStage, enteredAt: now }];
    }

    await dbSaveLead(updated);
    return NextResponse.json({ lead: updated });
  } catch (e) {
    console.error("PUT /api/leads/[id]", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dbDeleteLead(id);
  return NextResponse.json({ success: true });
}
