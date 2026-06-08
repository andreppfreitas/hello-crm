import { NextRequest, NextResponse } from "next/server";
import { dbGetAllReminders, dbSaveReminder } from "@/lib/db/reminders-db";
import type { Reminder } from "@/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function GET() {
  try {
    const reminders = await dbGetAllReminders();
    return NextResponse.json({ reminders });
  } catch (e) {
    console.error("GET /api/reminders", e);
    return NextResponse.json({ error: "Failed to load reminders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reminder: Reminder = body.id ? body : {
      ...body,
      id: `rem-${uid()}`,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    await dbSaveReminder(reminder);
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (e) {
    console.error("POST /api/reminders", e);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}
