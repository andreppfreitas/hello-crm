// Envio de e-mails de segurança via Resend (https://resend.com)
// Env: RESEND_API_KEY, SECURITY_EMAIL_FROM (ex: "Hello CRM <security@hellostudy.com>")

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailEnabled()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.SECURITY_EMAIL_FROM ?? "Hello CRM <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const wrap = (body: string) => `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px">
  <h2 style="color:#f59e0b;margin-top:0">Hello CRM</h2>
  ${body}
  <p style="font-size:12px;color:#64748b;margin-top:24px">Equipe Hello CRM · Este é um e-mail automático de segurança.</p>
</div>`;

export function sendLoginCode(to: string, name: string, code: string): Promise<boolean> {
  return send(to, "Código de acesso - Hello CRM", wrap(`
    <p>Olá ${name}.</p>
    <p>Seu código de verificação é:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#fff">${code}</p>
    <p>Este código expira em <b>5 minutos</b>.</p>
    <p>Caso você não tenha solicitado este acesso, recomendamos alterar sua senha imediatamente.</p>
  `));
}

export function sendPasswordChangedAlert(to: string, name: string, ctx: string): Promise<boolean> {
  return send(to, "Sua senha foi alterada - Hello CRM", wrap(`
    <p>Olá ${name}.</p>
    <p>A senha da sua conta foi alterada.</p>
    <p style="color:#94a3b8;font-size:13px">${ctx}</p>
    <p>Se não foi você, entre em contato com o administrador imediatamente.</p>
  `));
}

export function sendNewLoginAlert(to: string, name: string, ctx: string): Promise<boolean> {
  return send(to, "Novo acesso detectado - Hello CRM", wrap(`
    <p>Olá ${name}.</p>
    <p>Detectamos um novo acesso à sua conta:</p>
    <p style="color:#94a3b8;font-size:13px">${ctx}</p>
    <p>Caso não tenha sido você, altere sua senha imediatamente.</p>
  `));
}

export function sendLockoutAlert(to: string, name: string, ctx: string): Promise<boolean> {
  return send(to, "Conta bloqueada temporariamente - Hello CRM", wrap(`
    <p>Olá ${name}.</p>
    <p>Sua conta foi bloqueada temporariamente após várias tentativas inválidas.</p>
    <p style="color:#94a3b8;font-size:13px">${ctx}</p>
    <p>Se não foi você, altere sua senha assim que possível.</p>
  `));
}
