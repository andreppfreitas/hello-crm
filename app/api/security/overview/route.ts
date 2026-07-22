import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { dbGetUser } from "@/lib/db/users-db";
import { getSecurityLog, EVENT_LABELS } from "@/lib/security/log";
import { listSessions } from "@/lib/security/sessions";
import { emailEnabled } from "@/lib/security/email";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [user, log, sessions] = await Promise.all([
    dbGetUser(session.userId),
    getSecurityLog(session.userId, 20),
    listSessions(session.userId),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const lastLogin = log.find((e) => e.type === "login");
  const recentFails = log.filter(
    (e) => e.result === "fail" && Date.now() - new Date(e.at).getTime() < 7 * 86400000
  ).length;

  const passwordAgeDays = user.passwordChangedAt
    ? Math.floor((Date.now() - new Date(user.passwordChangedAt).getTime()) / 86400000)
    : null;

  // Status: 🟢 boa / 🟠 atenção
  const warnings: string[] = [];
  if (!user.passwordChangedAt) warnings.push("Senha criada no cadastro inicial — recomendamos alterar");
  else if (passwordAgeDays !== null && passwordAgeDays > 180) warnings.push("Senha antiga (mais de 6 meses)");
  if (sessions.length >= 5) warnings.push(`${sessions.length} sessões ativas`);
  if (recentFails >= 3) warnings.push("Tentativas inválidas recentes");
  if (!emailEnabled()) warnings.push("Verificação por e-mail (2FA) não configurada");

  return NextResponse.json({
    status: warnings.length === 0 ? "good" : "warning",
    warnings,
    positives: [
      user.passwordChangedAt ? "Senha atualizada" : null,
      lastLogin ? "Último login registrado" : null,
      emailEnabled() ? "Verificação por e-mail ativa" : null,
      recentFails === 0 ? "Nenhuma atividade suspeita" : null,
    ].filter(Boolean),
    lastLogin: lastLogin ?? null,
    passwordChangedAt: user.passwordChangedAt ?? null,
    passwordAgeDays,
    activeSessions: sessions.length,
    twoFactorEnabled: emailEnabled(),
    history: log.map((e) => ({ ...e, label: EVENT_LABELS[e.type] ?? e.type })),
  });
}
