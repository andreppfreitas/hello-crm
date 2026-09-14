import type { Lead } from "@/types";

/**
 * Visto já vencido.
 *
 * Aluno onshore com visto vencido está fora de status — deixou de ser um lead
 * viável e some da lista por padrão. A data continua no cadastro; o que muda é
 * só a visibilidade.
 *
 * Offshore não conta: quem está fora da Austrália não tem visto australiano
 * correndo, e uma data antiga nesse campo é dado velho, não situação irregular.
 */
export function isVisaExpired(lead: Lead, now = Date.now()): boolean {
  if (!lead.visaExpiryDate || lead.isOffshore) return false;
  const expiry = new Date(lead.visaExpiryDate).getTime();
  if (!Number.isFinite(expiry)) return false;
  return expiry < now;
}
