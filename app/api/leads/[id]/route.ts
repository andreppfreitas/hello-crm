import { NextRequest, NextResponse } from "next/server";
import { dbGetLead, dbSaveLead, dbDeleteLead } from "@/lib/db/leads-db";
import { dbLogActivity } from "@/lib/db/activity-db";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { dbGetUser } from "@/lib/db/users-db";
import { STAGE_CONFIG, STAGE_BEHAVIOR_CONFIG } from "@/lib/constants";
import type { Lead, PipelineStage, StageChangeEvent, StageChecklistItem } from "@/types";

async function getSessionUser(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  const [userId] = session.split(":");
  return dbGetUser(userId);
}

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
    const me = await getSessionUser(request);
    const changedBy = me?.displayName ?? data.assignedConsultant ?? "Sistema";

    let updated: Lead = { ...existing, ...data, updatedAt: now };

    // Track stage changes
    if (data.stage && data.stage !== existing.stage) {
      const change: StageChangeEvent = {
        id: `sc-${Date.now()}`,
        fromStage: existing.stage,
        toStage: data.stage,
        changedAt: now,
        changedBy,
      };
      updated.stageChanges = [change, ...(existing.stageChanges ?? [])];
      updated.stageHistory = existing.stageHistory.map((h) =>
        h.stage === existing.stage && !h.exitedAt ? { ...h, exitedAt: now } : h
      );
      updated.stageHistory = [...updated.stageHistory, { stage: data.stage as PipelineStage, enteredAt: now }];

      // Auto-populate nextAction, waitingFor, stageChecklist from config
      const behavior = STAGE_BEHAVIOR_CONFIG[data.stage];
      if (behavior) {
        // Only auto-set if not explicitly provided in the request
        if (!("nextAction" in data)) updated.nextAction = behavior.defaultNextAction;
        if (!("waitingFor" in data)) updated.waitingFor = behavior.defaultWaitingFor;
        // Always reset stage checklist when entering a new stage
        if (behavior.checklist.length > 0) {
          updated.stageChecklist = behavior.checklist.map((label, i): StageChecklistItem => ({
            id: `chk-${data.stage}-${i}`,
            label,
            done: false,
          }));
        } else {
          updated.stageChecklist = [];
        }
      }

      // Log stage change
      if (me) {
        await dbLogActivity({
          id: `act_${Date.now()}`,
          userId: me.id,
          userName: me.displayName,
          action: "stage_changed",
          leadId: existing.id,
          leadName: existing.fullName,
          details: `${STAGE_CONFIG[existing.stage]?.label ?? existing.stage} → ${STAGE_CONFIG[data.stage]?.label ?? data.stage}`,
          timestamp: now,
        });
      }
    }

    // Log temperature change
    if (data.temperature && data.temperature !== existing.temperature && me) {
      await dbLogActivity({
        id: `act_${Date.now() + 1}`,
        userId: me.id,
        userName: me.displayName,
        action: "temperature_changed",
        leadId: existing.id,
        leadName: existing.fullName,
        details: `${existing.temperature} → ${data.temperature}`,
        timestamp: now,
      });
    }

    // Log note added (notesList grows)
    if (data.notesList && data.notesList.length > (existing.notesList?.length ?? 0) && me) {
      const newest = data.notesList[0];
      await dbLogActivity({
        id: `act_${Date.now() + 2}`,
        userId: me.id,
        userName: me.displayName,
        action: "note_added",
        leadId: existing.id,
        leadName: existing.fullName,
        details: newest?.content?.slice(0, 80),
        timestamp: now,
      });
    }

    await dbSaveLead(updated);
    return NextResponse.json({ lead: updated });
  } catch (e) {
    console.error("PUT /api/leads/[id]", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await dbGetLead(id);
  const me = await getSessionUser(request);
  if (existing && me) {
    await dbLogActivity({
      id: `act_${Date.now()}`,
      userId: me.id,
      userName: me.displayName,
      action: "lead_deleted",
      leadId: id,
      leadName: existing.fullName,
      timestamp: new Date().toISOString(),
    });
  }
  await dbDeleteLead(id);
  return NextResponse.json({ success: true });
}
