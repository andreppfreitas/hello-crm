/**
 * Cotação do aluno.
 *
 * O modelo acompanha o que o 1Enrol realmente emite: blocos de curso, grupos de
 * custo (Visto, Seguro Saúde, Outros) e um cronograma de pagamentos com datas
 * reais — e não um parcelamento genérico.
 */

export interface FeeLine {
  label: string;   // "Valor do Curso", "Taxa de Material"
  detail?: string; // "1 × AUD 1.700,00"
  amount: number;  // negativo = desconto
}

export interface QuotationCourse {
  id: string;
  school: string;
  course: string;
  location?: string;            // "Sydney, New South Wales, Australia"
  cricos?: string;              // código CRICOS da escola
  durationLabel: string;        // "88 semanas"
  startDate?: string;           // YYYY-MM-DD
  endDate?: string;
  fees: FeeLine[];
}

export interface CostLine {
  label: string;
  detail?: string;
  amount: number;
}

/** Visto, Seguro Saúde, Outros — como o 1Enrol agrupa fora do curso. */
export interface CostGroup {
  id: string;
  title: string;
  /** Explicação em linguagem de aluno — é o que falta no PDF cru. */
  explanation?: string;
  lines: CostLine[];
}

/** Uma parcela do Resumo de Pagamentos, com vencimento de verdade. */
export interface ScheduledPayment {
  id: string;
  dueDate: string;        // YYYY-MM-DD
  description: string;    // "Tuition Fee", "Visa", "Health Cover"
  payee?: string;         // para quem vai o dinheiro
  amount: number;
}

export type QuotationStatus = "draft" | "sent" | "accepted" | "expired";

export interface Quotation {
  id: string;
  leadId: string;
  number: string;               // HA-0001 ou o nº do 1Enrol
  packageName: string;
  city: string;
  currency: string;             // AUD
  courses: QuotationCourse[];
  costGroups: CostGroup[];
  schedule: ScheduledPayment[];
  importantNote?: string;
  validUntil?: string;
  status: QuotationStatus;
  /** Token do link público — quem tem o link vê a cotação. */
  publicToken: string;
  sourceFileName?: string;
  sourceNumber?: string;        // "Cotação nº226601" do 1Enrol
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Totais derivados — nunca gravados, sempre recalculados. */
export interface QuotationTotals {
  courseTotals: { courseId: string; total: number }[];
  coursesTotal: number;
  groupTotals: { groupId: string; total: number }[];
  extrasTotal: number;
  grandTotal: number;
  /** Soma das parcelas que vencem na primeira data do cronograma. */
  upfrontTotal: number;
  upfrontDate?: string;
  /** O que fica para depois dessa primeira data. */
  remainingTotal: number;
  scheduleTotal: number;
}
