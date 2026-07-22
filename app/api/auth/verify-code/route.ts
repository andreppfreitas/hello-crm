import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth-config";
import { verifyLoginCode, getPendingLogin } from "@/lib/security/codes";
import { createSession } from "@/lib/security/sessions";
import { trustDevice, TRUSTED_COOKIE, TRUSTED_TTL } from "@/lib/security/trusted";
import { getRequestInfo } from "@/lib/security/request-info";
import { logSecurityEvent } from "@/lib/security/log";
import { lockAccount } from "@/lib/security/rate-limit";
import { dbGetUser } from "@/lib/db/users-db";
import { sendNewLoginAlert, sendLockoutAlert } from "@/lib/security/email";

export async function POST(request: NextRequest) {
  const info = getRequestInfo(request);
  const body = await request.json().catch(() => null);
  const pendingId = String(body?.pendingId ?? "");
  const code = String(body?.code ?? "");
  const trust = !!body?.trustDevice;
  if (!pendingId || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const pending = await getPendingLogin(pendingId);
  const result = await verifyLoginCode(pendingId, code);

  if (!result.ok) {
    if (pending) {
      if (result.reason === "invalid") await logSecurityEvent(pending.userId, "code_invalid", info, "fail");
      if (result.reason === "expired") await logSecurityEvent(pending.userId, "code_expired", info, "fail");
      if (result.reason === "locked") {
        await lockAccount(pending.userId, 15 * 60);
        await logSecurityEvent(pending.userId, "account_locked", info, "fail");
        const user = await dbGetUser(pending.userId);
        if (user) {
          sendLockoutAlert(user.username, user.displayName.split(" ")[0],
            `${info.browser} · ${info.os} · ${info.city}, ${info.country}`).catch(() => {});
        }
      }
    }
    const messages = {
      expired: "Código expirado. Faça login novamente.",
      invalid: `Código inválido.${result.attemptsLeft !== undefined ? ` ${result.attemptsLeft} tentativa(s) restante(s).` : ""}`,
      locked: "Muitas tentativas. Conta bloqueada por 15 minutos.",
      used: "Código já utilizado. Faça login novamente.",
    } as const;
    const status = result.reason === "locked" ? 423 : result.reason === "invalid" ? 401 : 410;
    return NextResponse.json({ error: messages[result.reason], reason: result.reason }, { status });
  }

  const user = await dbGetUser(result.userId);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const token = await createSession(user.id, user.role, info);
  await logSecurityEvent(user.id, "code_validated", info);
  await logSecurityEvent(user.id, "login", info);
  await logSecurityEvent(user.id, "session_created", info);
  sendNewLoginAlert(
    user.username,
    user.displayName.split(" ")[0],
    `${info.browser} · ${info.os} · ${info.city}, ${info.country} · ${new Date().toLocaleString("pt-BR")}`
  ).catch(() => {});

  const response = NextResponse.json({ success: true, name: user.displayName, role: user.role });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  if (trust) {
    const trustedToken = await trustDevice(user.id, info);
    await logSecurityEvent(user.id, "trusted_device_added", info);
    response.cookies.set(TRUSTED_COOKIE, trustedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TRUSTED_TTL,
      path: "/",
    });
  }

  return response;
}
