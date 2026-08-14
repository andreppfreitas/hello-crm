import type { Lead, ContactEvent } from "@/types";

/**
 * Monta o patch que registra um contato no lead.
 *
 * Usado sempre que o consultor dispara WhatsApp/e-mail pelo CRM. Como o envio
 * acontece fora do sistema (wa.me / mailto), o que registramos é "o contato foi
 * iniciado" — não há confirmação de entrega.
 */
export function logContact(
  lead: Lead,
  type: ContactEvent["type"],
  summary: string,
  authorName: string
): Partial<Lead> {
  const date = new Date().toISOString();
  const event: ContactEvent = {
    id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    summary,
    authorName,
    date,
  };
  return {
    lastContactAt: date,
    contactHistory: [event, ...(lead.contactHistory ?? [])].slice(0, 200),
  };
}

/** Descrição curta do contato: nome do template, ou um trecho da mensagem. */
export function contactSummary(
  channel: "whatsapp" | "email",
  templateLabel: string | null,
  message: string
): string {
  const prefix = channel === "whatsapp" ? "WhatsApp" : "E-mail";
  if (templateLabel) return `${prefix}: ${templateLabel}`;
  const text = message.trim().replace(/\s+/g, " ");
  if (!text) return `${prefix}: conversa aberta`;
  return `${prefix}: ${text.length > 70 ? `${text.slice(0, 70)}…` : text}`;
}
