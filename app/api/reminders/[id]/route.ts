import { NextRequest, NextResponse } from "next/server";
import { dbGetAllReminders, dbSaveReminder, dbDeleteReminder } from "@/lib/db/reminders-db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const all = await dbGetAllReminders();
    const existing = all.find((r) => r.id === id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await request.json();
    const updated = { ...existing, ...data };
    await dbSaveReminder(updated);
    return NextResponse.json({ reminder: updated });
  } catch (e) {
    console.error("PUT /api/reminders/[id]", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dbDeleteReminder(id);
  return NextResponse.json({ success: true });
}
