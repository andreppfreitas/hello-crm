import type { Quotation, QuotationCourse, QuotationTotals } from "@/types/quotation";

/** Soma as linhas de taxa de um curso (descontos entram negativos). */
export function courseTotal(course: QuotationCourse): number {
  return course.fees.reduce((sum, f) => sum + (Number.isFinite(f.amount) ? f.amount : 0), 0);
}

/** Saldo que sobra para parcelar depois da entrada. */
export function courseRemaining(course: QuotationCourse): number {
  return Math.max(0, courseTotal(course) - (course.deposit || 0));
}

/** Quanto o plano de parcelas cobre — serve para conferir contra o saldo. */
export function installmentsTotal(course: QuotationCourse): number {
  return course.installments.reduce((s, t) => s + t.count * t.amount, 0);
}

export function computeTotals(q: Quotation): QuotationTotals {
  const courseTotals = q.courses.map((c) => ({ courseId: c.id, total: courseTotal(c) }));
  const coursesTotal = courseTotals.reduce((s, c) => s + c.total, 0);
  const depositTotal = q.courses.reduce((s, c) => s + (c.deposit || 0), 0);
  const visaTotal = q.visaCosts.reduce((s, v) => s + (Number.isFinite(v.amount) ? v.amount : 0), 0);
  const remainingTotal = q.courses.reduce((s, c) => s + courseRemaining(c), 0);

  return {
    courseTotals,
    coursesTotal,
    depositTotal,
    visaTotal,
    upfrontTotal: depositTotal + visaTotal,
    remainingTotal,
    grandTotal: coursesTotal + visaTotal,
  };
}

/**
 * Avisos de inconsistência, mostrados ao consultor antes de enviar.
 * A cotação é um documento que o aluno usa para decidir — número errado aqui
 * custa confiança, então vale gritar antes de sair.
 */
export function quotationWarnings(q: Quotation): string[] {
  const avisos: string[] = [];

  if (q.courses.length === 0) avisos.push("Nenhum curso adicionado.");

  for (const c of q.courses) {
    const nome = c.course || "curso sem nome";
    if (!c.school?.trim()) avisos.push(`${nome}: escola não preenchida.`);
    if (courseTotal(c) <= 0) avisos.push(`${nome}: valor total zerado.`);
    if (c.deposit > courseTotal(c)) avisos.push(`${nome}: entrada maior que o valor do curso.`);

    const parcelado = installmentsTotal(c);
    const saldo = courseRemaining(c);
    // Tolerância de 1 unidade para arredondamento da escola
    if (parcelado > 0 && Math.abs(parcelado - saldo) > 1) {
      avisos.push(
        `${nome}: parcelas somam ${fmt(parcelado, q.currency)} mas o saldo é ${fmt(saldo, q.currency)}.`
      );
    }
  }

  if (q.validUntil && new Date(q.validUntil).getTime() < Date.now()) {
    avisos.push("A data de validade já passou.");
  }

  return avisos;
}

/**
 * Mostra a sigla da moeda, não só "$".
 * O aluno é brasileiro lendo valores australianos — "$5,580" é ambíguo com
 * dólar americano e com real; "AUD 5,580.00" não é.
 */
export function fmt(value: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency", currency, currencyDisplay: "code", minimumFractionDigits: 2,
  }).format(value).replace(/ /g, " ");
}

/** Data de fim estimada a partir do início e da duração escrita pela escola. */
export function estimateEndDate(startDate: string, durationLabel: string): string | undefined {
  const start = new Date(startDate);
  if (!Number.isFinite(start.getTime())) return undefined;

  const m = /(\d+(?:[.,]\d+)?)\s*(semana|week|m[eê]s|mes|month|ano|year)/i.exec(durationLabel);
  if (!m) return undefined;

  const n = Number(m[1].replace(",", "."));
  const unidade = m[2].toLowerCase();
  const fim = new Date(start);

  if (/semana|week/.test(unidade)) fim.setDate(fim.getDate() + Math.round(n * 7));
  else if (/ano|year/.test(unidade)) fim.setMonth(fim.getMonth() + Math.round(n * 12));
  else fim.setMonth(fim.getMonth() + Math.round(n));

  return fim.toISOString().slice(0, 10);
}

/** Número sequencial legível: HA-0001. */
export function formatQuotationNumber(seq: number): string {
  return `HA-${String(seq).padStart(4, "0")}`;
}
