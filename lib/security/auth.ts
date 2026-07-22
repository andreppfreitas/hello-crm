// Valida a sessão da request contra o Redis (usar em toda rota autenticada)
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { getSession, touchSession, type SessionRecord } from "./sessions";

export async function requireSession(request: NextRequest): Promise<SessionRecord | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  // atualiza lastSeen no máximo 1x/minuto para não custar um write por request
  if (Date.now() - new Date(session.lastSeenAt).getTime() > 60_000) {
    await touchSession(session);
  }
  return session;
}
