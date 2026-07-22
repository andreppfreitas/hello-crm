import { NextRequest, NextResponse } from "next/server";
import { dbGetUser, dbSaveUser, checkPassword } from "@/lib/db/users-db";
import { hashPasswordSecure } from "@/lib/security/crypto";
import { requireSession } from "@/lib/security/auth";
import { revokeOtherSessions } from "@/lib/security/sessions";
import { revokeTrustedDevices } from "@/lib/security/trusted";
import { getRequestInfo } from "@/lib/security/request-info";
import { logSecurityEvent } from "@/lib/security/log";
import { sendPasswordChangedAlert } from "@/lib/security/email";
import { rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const info = getRequestInfo(request);

  const rl = await rateLimit("chpass", session.userId, 5, 15 * 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");
  if (!currentPassword || !newPassword || newPassword.length > 200) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await dbGetUser(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!checkPassword(currentPassword, user.passwordHash)) {
    await logSecurityEvent(user.id, "invalid_attempt", info, "fail");
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Nova senha deve ter pelo menos 8 caracteres" }, { status: 400 });
  }
  if (checkPassword(newPassword, user.passwordHash)) {
    return NextResponse.json({ error: "A nova senha deve ser diferente da anterior" }, { status: 400 });
  }

  await dbSaveUser({
    ...user,
    passwordHash: hashPasswordSecure(newPassword),
    passwordChangedAt: new Date().toISOString(),
  });

  // invalida tudo, menos a sessão atual
  const revoked = await revokeOtherSessions(user.id, session.id);
  await revokeTrustedDevices(user.id);
  await logSecurityEvent(user.id, "password_changed", info);
  sendPasswordChangedAlert(
    user.username,
    user.displayName.split(" ")[0],
    `${info.browser} · ${info.os} · ${info.city}, ${info.country} · ${new Date().toLocaleString("pt-BR")}`
  ).catch(() => {});

  return NextResponse.json({ success: true, revokedSessions: revoked });
}
