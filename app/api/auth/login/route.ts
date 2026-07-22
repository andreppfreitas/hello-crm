import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth-config";
import { dbGetUserByUsername, dbEnsureUsersSeeded, checkPassword, dbSaveUser } from "@/lib/db/users-db";
import { getRequestInfo, maskEmail } from "@/lib/security/request-info";
import { rateLimit, isAccountLocked } from "@/lib/security/rate-limit";
import { createSession } from "@/lib/security/sessions";
import { createPendingLogin } from "@/lib/security/codes";
import { isTrustedDevice, TRUSTED_COOKIE } from "@/lib/security/trusted";
import { logSecurityEvent } from "@/lib/security/log";
import { emailEnabled, sendLoginCode, sendNewLoginAlert } from "@/lib/security/email";
import { needsRehash, hashPasswordSecure } from "@/lib/security/crypto";

export async function POST(request: NextRequest) {
  const info = getRequestInfo(request);
  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!username || !password || username.length > 200 || password.length > 200) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Rate limit: 10 tentativas por 15min por IP+usuário
  const rl = await rateLimit("login", `${info.ip}:${username}`, 10, 15 * 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${Math.ceil(rl.retryAfterSeconds / 60)} min.` },
      { status: 429 }
    );
  }

  await dbEnsureUsersSeeded();
  const user = await dbGetUserByUsername(username);
  if (!user || !checkPassword(password, user.passwordHash)) {
    if (user) await logSecurityEvent(user.id, "invalid_attempt", info, "fail");
    return NextResponse.json({ error: "Usuário ou senha incorretos" }, { status: 401 });
  }

  const lockTtl = await isAccountLocked(user.id);
  if (lockTtl > 0) {
    return NextResponse.json(
      { error: `Conta bloqueada temporariamente. Aguarde ${Math.ceil(lockTtl / 60)} min.` },
      { status: 423 }
    );
  }

  // Upgrade transparente do hash legado para scrypt
  if (needsRehash(user.passwordHash)) {
    await dbSaveUser({ ...user, passwordHash: hashPasswordSecure(password) });
  }

  const trustedToken = request.cookies.get(TRUSTED_COOKIE)?.value;
  const trusted = await isTrustedDevice(trustedToken, user.id, info);

  // 2FA por e-mail — pulado se dispositivo confiável ou e-mail não configurado
  if (emailEnabled() && !trusted) {
    const { pendingId, code } = await createPendingLogin(user.id, user.role, info);
    const sent = await sendLoginCode(user.username, user.displayName.split(" ")[0], code);
    await logSecurityEvent(user.id, "code_sent", info, sent ? "ok" : "fail");
    if (!sent) {
      return NextResponse.json({ error: "Falha ao enviar o código por e-mail. Tente novamente." }, { status: 502 });
    }
    return NextResponse.json({ step: "verify", pendingId, maskedEmail: maskEmail(user.username) });
  }

  // Login direto (dispositivo confiável ou 2FA desativado)
  const token = await createSession(user.id, user.role, info);
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
  return response;
}
