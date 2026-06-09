import { NextRequest, NextResponse } from "next/server";
import { dbGetAllLeads, dbSaveLead, dbLeadsCount } from "@/lib/db/leads-db";
import { generateSeedLeads, buildNewLead } from "@/lib/lead-builder";
import { dbLogActivity } from "@/lib/db/activity-db";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { dbGetUser } from "@/lib/db/users-db";
import type { Lead } from "@/types";

async function getSessionUser(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  const [userId] = session.split(":");
  return dbGetUser(userId);
}

// Auto-seed if DB is empty
async function ensureSeeded() {
  const count = await dbLeadsCount();
  if (count === 0) {
    const seeds = generateSeedLeads(50);
    await Promise.all(seeds.map((l) => dbSaveLead(l)));
  }
}

export async function GET() {
  try {
    await ensureSeeded();
    const leads = await dbGetAllLeads();
    return NextResponse.json({ leads });
  } catch (e) {
    console.error("GET /api/leads", e);
    return NextResponse.json({ error: "Failed to load leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lead: Lead = body.id ? body : buildNewLead(body);
    await dbSaveLead(lead);

    // Log activity
    const me = await getSessionUser(request);
    if (me) {
      await dbLogActivity({
        id: `act_${Date.now()}`,
        userId: me.id,
        userName: me.displayName,
        action: "lead_created",
        leadId: lead.id,
        leadName: lead.fullName,
        details: `Atribuído a ${lead.assignedConsultant}`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (e) {
    console.error("POST /api/leads", e);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
