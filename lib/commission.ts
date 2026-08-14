import type { Lead, EnrollmentOption, PhaseGroup } from "@/types";
import { STAGE_CONFIG } from "./constants";

/**
 * Converte o tuition fee (texto livre) em número.
 *
 * Aceita os formatos que aparecem na prática: "AUD 12,500", "12.500,00",
 * "$12,500.00", "12500". Quando há dois separadores, o ÚLTIMO é o decimal.
 * Quando há só um, ele é separador de milhar se vier seguido de exatamente
 * 3 dígitos ("12.500" = 12500); caso contrário é decimal ("12,50" = 12.5).
 *
 * Retorna null quando não dá para interpretar — nunca 0, para não confundir
 * "não preenchido" com "de graça".
 */
export function parseMoney(value?: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    // Ambos presentes: o último é o decimal, o outro é milhar
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = cleaned.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? "," : ".";
    const idx = lastComma >= 0 ? lastComma : lastDot;
    const decimals = cleaned.length - idx - 1;
    const occurrences = cleaned.split(sep).length - 1;
    // 3 dígitos depois (ou mais de um separador) = milhar
    normalized = decimals === 3 || occurrences > 1
      ? cleaned.split(sep).join("")
      : cleaned.replace(sep, ".");
  } else {
    normalized = cleaned;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatAUD(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Enrollments que valem dinheiro. Se o aluno tem uma única opção, ela é a
 * escolhida por definição. Com várias opções, só conta a marcada como confirmada.
 */
export function billableEnrollments(lead: Lead): EnrollmentOption[] {
  const withData = (lead.enrollments ?? []).filter((e) => e.course?.trim() || e.school?.trim());
  const confirmed = withData.filter((e) => e.confirmed);
  if (confirmed.length > 0) return confirmed;
  return withData.length === 1 ? withData : [];
}

/** Comissão esperada de um enrollment: tuition × taxa. Null se faltar dado. */
export function enrollmentCommission(enr: EnrollmentOption): number | null {
  const fee = parseMoney(enr.tuitionFee);
  if (fee === null || !enr.commissionRate) return null;
  return (fee * enr.commissionRate) / 100;
}

/** Probabilidade de fechamento por fase — usada para ponderar o pipeline. */
export const PHASE_PROBABILITY: Record<PhaseGroup, number> = {
  leads: 0.05,
  qualifying: 0.15,
  proposal: 0.3,
  enrollment: 0.6,
  documents: 0.75,
  payments: 0.9,
  visa: 1,
};

export interface LeadCommission {
  total: number;        // comissão esperada somando os enrollments faturáveis
  weighted: number;     // total × probabilidade da fase
  received: number;
  invoiced: number;
  pending: number;
  missingData: boolean; // tem enrollment sem tuition ou sem taxa
}

export function leadCommission(lead: Lead): LeadCommission {
  const enrollments = billableEnrollments(lead);
  const phase = STAGE_CONFIG[lead.stage]?.phase ?? "leads";
  const probability = PHASE_PROBABILITY[phase] ?? 0;

  let total = 0, received = 0, invoiced = 0, pending = 0, missingData = false;

  for (const enr of enrollments) {
    const value = enrollmentCommission(enr);
    if (value === null) {
      missingData = true;
      continue;
    }
    total += value;
    if (enr.commissionStatus === "received") received += value;
    else if (enr.commissionStatus === "invoiced") invoiced += value;
    else pending += value;
  }

  return { total, weighted: total * probability, received, invoiced, pending, missingData };
}

export interface RevenueSummary {
  received: number;         // dinheiro na mão
  invoiced: number;         // faturado, escola ainda não pagou
  pendingClosed: number;    // aluno fechou (visto/pagamentos), falta faturar
  forecast: number;         // pipeline ponderado dos que ainda não fecharam
  totalPipeline: number;    // pipeline bruto, sem ponderar
  leadsMissingData: number;
}

const CLOSED_PHASES: PhaseGroup[] = ["payments", "visa"];

export function revenueSummary(leads: Lead[]): RevenueSummary {
  const summary: RevenueSummary = {
    received: 0, invoiced: 0, pendingClosed: 0,
    forecast: 0, totalPipeline: 0, leadsMissingData: 0,
  };

  for (const lead of leads) {
    const c = leadCommission(lead);
    if (c.missingData) summary.leadsMissingData += 1;
    if (c.total === 0) continue;

    summary.received += c.received;
    summary.invoiced += c.invoiced;

    const phase = STAGE_CONFIG[lead.stage]?.phase ?? "leads";
    if (CLOSED_PHASES.includes(phase) || lead.temperature === "closed") {
      summary.pendingClosed += c.pending;
    } else {
      summary.totalPipeline += c.pending;
      summary.forecast += c.pending * (PHASE_PROBABILITY[phase] ?? 0);
    }
  }

  return summary;
}

export interface SchoolRevenue {
  school: string;
  students: number;
  tuition: number;
  commission: number;
  received: number;
}

export function revenueBySchool(leads: Lead[]): SchoolRevenue[] {
  const map = new Map<string, SchoolRevenue>();

  for (const lead of leads) {
    for (const enr of billableEnrollments(lead)) {
      const name = enr.school?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const entry = map.get(key) ?? { school: name, students: 0, tuition: 0, commission: 0, received: 0 };
      entry.students += 1;
      entry.tuition += parseMoney(enr.tuitionFee) ?? 0;
      const value = enrollmentCommission(enr);
      if (value !== null) {
        entry.commission += value;
        if (enr.commissionStatus === "received") entry.received += value;
      }
      map.set(key, entry);
    }
  }

  return [...map.values()].sort((a, b) => b.commission - a.commission);
}

/** Comissão agrupada pelo mês de início do curso — base do fluxo de caixa. */
export function revenueByMonth(leads: Lead[]): { month: string; label: string; commission: number }[] {
  const map = new Map<string, number>();

  for (const lead of leads) {
    for (const enr of billableEnrollments(lead)) {
      if (!enr.courseStartDate) continue;
      const value = enrollmentCommission(enr);
      if (value === null) continue;
      const month = enr.courseStartDate.slice(0, 7); // YYYY-MM
      map.set(month, (map.get(month) ?? 0) + value);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, commission]) => {
      const [y, m] = month.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1)
        .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      return { month, label, commission };
    });
}
