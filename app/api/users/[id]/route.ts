import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { dbGetUser, dbSaveUser, dbDeleteUser, hashPassword } from "@/lib/db/users-db";

async function getSessionUser(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return null;
  return dbGetUser(session.userId);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionUser(request);
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await dbGetUser(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  await dbSaveUser({
    ...user,
    displayName: body.displayName ?? user.displayName,
    role: body.role ?? user.role,
    office: body.office !== undefined ? body.office : user.office,
    ...(body.password ? { passwordHash: hashPassword(body.password) } : {}),
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionUser(request);
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (id === me.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  await dbDeleteUser(id);
  return NextResponse.json({ success: true });
}
