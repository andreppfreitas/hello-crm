import { NextRequest, NextResponse } from "next/server";
import { dbGetAllLeads, dbSaveLead, dbLeadsCount } from "@/lib/db/leads-db";
import { generateSeedLeads, buildNewLead } from "@/lib/lead-builder";
import type { Lead } from "@/types";

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
    // Accept either a pre-built lead (from client optimistic) or raw data
    const lead: Lead = body.id ? body : buildNewLead(body);
    await dbSaveLead(lead);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (e) {
    console.error("POST /api/leads", e);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
