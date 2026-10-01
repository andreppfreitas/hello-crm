import type {
  Quotation, QuotationCourse, CostGroup, QuotationTotals, ScheduledPayment,
} from "@/types/quotation";

const soma = (ns: number[]) => ns.reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);

export function courseTotal(course: QuotationCourse): number {
  return soma(course.fees.map((f) => f.amount));
}

export function groupTotal(group: CostGroup): number {
  return soma(group.lines.map((l) => l.amount));
}

export function scheduleTotal(schedule: ScheduledPayment[]): number {
  return soma(schedule.map((p) => p.amount));
}

/** Parcelas ordenadas por vencimento. */
export function sortedSchedule(schedule: ScheduledPayment[]): ScheduledPayment[] {
  return [...schedule].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
}

export function computeTotals(q: Quotation): QuotationTotals {
  const courseTotals = q.courses.map((c) => ({ courseId: c.id, total: courseTotal(c) }));
  const groupTotals = q.costGroups.map((g) => ({ groupId: g.id, total: groupTotal(g) }));
  const coursesTotal = soma(courseTotals.map((c) => c.total));
  const extrasTotal = soma(groupTotals.map((g) => g.total));

  // "Quanto pago agora" = tudo que vence na primeira data do cronograma.
  // É a pergunta que o aluno faz primeiro, e o cronograma responde com precisão.
  const ordenado = sortedSchedule(q.schedule).filter((p) => p.dueDate);
  const upfrontDate = ordenado[0]?.dueDate;
  const upfrontTotal = upfrontDate
    ? soma(ordenado.filter((p) => p.dueDate === upfrontDate).map((p) => p.amount))
    : 0;
  const total = scheduleTotal(q.schedule);

  return {
    courseTotals,
    coursesTotal,
    groupTotals,
    extrasTotal,
    grandTotal: coursesTotal + extrasTotal,
    upfrontTotal,
    upfrontDate,
    remainingTotal: Math.max(0, total - upfrontTotal),
    scheduleTotal: total,
  };
}

/**
 * Inconsistências que o consultor precisa ver antes de mandar para o aluno.
 * Cotação é documento de decisão financeira — número errado aqui custa caro.
 */
export function quotationWarnings(q: Quotation): string[] {
  const avisos: string[] = [];

  if (q.courses.length === 0) avisos.push("Nenhum curso adicionado.");

  for (const c of q.courses) {
    const nome = c.course || "curso sem nome";
    if (!c.school?.trim()) avisos.push(`${nome}: escola não preenchida.`);
    if (courseTotal(c) <= 0) avisos.push(`${nome}: valor total zerado.`);
  }

  const t = computeTotals(q);
  // O cronograma tem que fechar com o valor cotado, senão o aluno paga errado.
  // 1 unidade de tolerância cobre arredondamento da escola.
  if (q.schedule.length > 0 && Math.abs(t.scheduleTotal - t.grandTotal) > 1) {
    avisos.push(
      `O cronograma soma ${fmt(t.scheduleTotal, q.currency)} mas a cotação é ${fmt(t.grandTotal, q.currency)}.`
    );
  }
  if (q.schedule.some((p) => !p.dueDate)) {
    avisos.push("Há parcela sem data de vencimento.");
  }
  if (q.validUntil && new Date(`${q.validUntil}T23:59:59`).getTime() < Date.now()) {
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

/** Data de fim estimada, usada só quando o PDF não traz a data de término. */
export function estimateEndDate(startDate: string, durationLabel: string): string | undefined {
  const start = new Date(`${startDate}T12:00:00`);
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

export function formatQuotationNumber(seq: number): string {
  return `HA-${String(seq).padStart(4, "0")}`;
}
