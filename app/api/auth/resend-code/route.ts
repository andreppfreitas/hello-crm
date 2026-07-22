import { NextRequest, NextResponse } from "next/server";
import { resendLoginCode, getPendingLogin } from "@/lib/security/codes";
import { getRequestInfo } from "@/lib/security/request-info";
import { logSecurityEvent } from "@/lib/security/log";
import { dbGetUser } from "@/lib/db/users-db";
import { sendLoginCode } from "@/lib/security/email";

export async function POST(request: NextRequest) {
  const info = getRequestInfo(request);
  const body = await request.json().catch(() => null);
  const pendingId = String(body?.pendingId ?? "");
  if (!pendingId) return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });

  const result = await resendLoginCode(pendingId);
  if ("error" in result) {
    if (result.error === "cooldown") {
      return NextResponse.json({ error: `Aguarde ${result.waitSeconds}s para reenviar.` }, { status: 429 });
    }
    return NextResponse.json({ error: "Sessão de verificação expirada. Faça login novamente." }, { status: 410 });
  }

  const pending = await getPendingLogin(pendingId);
  if (!pending) return NextResponse.json({ error: "Sessão expirada" }, { status: 410 });
  const user = await dbGetUser(pending.userId);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const sent = await sendLoginCode(user.username, user.displayName.split(" ")[0], result.code);
  await logSecurityEvent(user.id, "code_sent", info, sent ? "ok" : "fail");
  if (!sent) return NextResponse.json({ error: "Falha ao enviar o e-mail." }, { status: 502 });
  return NextResponse.json({ success: true });
}
