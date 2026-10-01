/**
 * Cotação do aluno.
 *
 * O 1Enrol gera um PDF cru; aqui ele vira dado estruturado para montar a versão
 * explicada que o aluno recebe por link. Os valores ficam em centavos? Não —
 * em unidades da moeda, como número, porque é assim que a escola cota.
 */

export interface FeeLine {
  label: string;   // "Tuition", "Material Fee", "Enrolment Fee"
  amount: number;  // negativo = desconto
}

export interface InstallmentTier {
  count: number;   // quantas parcelas
  amount: number;  // valor de cada uma
}

export interface QuotationCourse {
  id: string;
  school: string;
  course: string;
  durationLabel: string;        // "24 semanas", "2 anos" — como a escola escreve
  startDate?: string;           // YYYY-MM-DD
  endDate?: string;
  fees: FeeLine[];
  /** Entrada necessária para a escola emitir o CoE. */
  deposit: number;
  /** Parcelamento do saldo restante. */
  installments: InstallmentTier[];
  installmentNote?: string;     // "aprox. a cada 4 semanas"
}

export interface VisaCostLine {
  label: string;    // "Taxa do visto de estudante", "OSHC"
  detail?: string;  // "33 meses", "1 pessoa"
  amount: number;
}

export type QuotationStatus = "draft" | "sent" | "accepted" | "expired";

export interface Quotation {
  id: string;
  leadId: string;
  number: string;              // HA-0001
  packageName: string;         // "6 meses de inglês + 2 anos de Joinery"
  city: string;
  currency: string;            // AUD
  courses: QuotationCourse[];
  visaCosts: VisaCostLine[];
  /** Aviso em destaque no topo, quando houver algo que o aluno precisa saber. */
  importantNote?: string;
  validUntil?: string;         // YYYY-MM-DD
  status: QuotationStatus;
  /** Token do link público — quem tem o link vê a cotação. */
  publicToken: string;
  sourceFileName?: string;     // PDF do 1Enrol que originou
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Totais derivados — nunca gravados, sempre recalculados. */
export interface QuotationTotals {
  courseTotals: { courseId: string; total: number }[];
  coursesTotal: number;
  depositTotal: number;        // o que paga agora, para obter o CoE
  visaTotal: number;
  upfrontTotal: number;        // depósito + custos de visto
  remainingTotal: number;      // saldo parcelado
  grandTotal: number;          // tudo somado
}
