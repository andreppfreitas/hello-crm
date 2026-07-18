import type { VisaChecklistItem } from "@/types";

export const DEFAULT_VISA_CHECKLIST: Omit<VisaChecklistItem, "id">[] = [
  // Identidade
  { label: "Passaporte (válido por 6+ meses)", category: "identity", status: "pending" },
  // Matrícula
  { label: "CoE – Confirmation of Enrolment", category: "enrollment", status: "pending" },
  { label: "OSHC – Seguro Saúde (válido por todo o curso)", category: "enrollment", status: "pending" },
  { label: "Contrato assinado Hello Australia", category: "enrollment", status: "pending" },
  // Formulários de visto
  { label: "Form 500 – Student Visa Application", category: "other", status: "pending" },
  { label: "Form 956A – Appointment of Migration Agent", category: "other", status: "pending" },
  { label: "GS Letter – Genuine Student Letter", category: "other", status: "pending" },
  { label: "GS Statement – Genuine Student Statement", category: "other", status: "pending" },
  // Financeiro
  { label: "Bank Statement (últimos 3 meses)", category: "financial", status: "pending" },
  { label: "Taxa do visto paga (AUD 710)", category: "financial", status: "pending" },
];

export function buildVisaChecklist(): VisaChecklistItem[] {
  return DEFAULT_VISA_CHECKLIST.map((item, i) => ({
    ...item,
    id: `visa-${i}`,
  }));
}
