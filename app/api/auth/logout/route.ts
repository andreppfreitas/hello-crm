import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { getSession, revokeSessionById } from "@/lib/security/sessions";
import { getRequestInfo } from "@/lib/security/request-info";
import { logSecurityEvent } from "@/lib/security/log";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const session = await getSession(token);
    if (session) {
      await revokeSessionById(session.userId, session.id);
      await logSecurityEvent(session.userId, "logout", getRequestInfo(request));
    }
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
