import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { listSessions, revokeSessionById, revokeOtherSessions } from "@/lib/security/sessions";
import { getRequestInfo, maskIP } from "@/lib/security/request-info";
import { logSecurityEvent } from "@/lib/security/log";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const sessions = await listSessions(session.userId);
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      device: s.device,
      os: s.os,
      browser: s.browser,
      city: s.city,
      country: s.country,
      ip: maskIP(s.ip),
      lastSeenAt: s.lastSeenAt,
      createdAt: s.createdAt,
      current: s.id === session.id,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const info = getRequestInfo(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const others = searchParams.get("others");

  if (others === "1") {
    const count = await revokeOtherSessions(session.userId, session.id);
    await logSecurityEvent(session.userId, "session_revoked", info);
    return NextResponse.json({ success: true, revoked: count });
  }
  if (id) {
    if (id === session.id) {
      return NextResponse.json({ error: "Use logout para encerrar a sessão atual" }, { status: 400 });
    }
    // só permite revogar sessões do próprio usuário
    const mine = await listSessions(session.userId);
    if (!mine.some((s) => s.id === id)) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }
    await revokeSessionById(session.userId, id);
    await logSecurityEvent(session.userId, "session_revoked", info);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Parâmetro ausente" }, { status: 400 });
}
