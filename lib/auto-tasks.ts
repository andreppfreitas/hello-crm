import type { Lead, Task } from "@/types";

export interface AutoTask extends Task {
  auto: true;
  fieldHref: string; // anchor on the lead profile to jump to
}

const AUTO_TASK_DEFS: {
  id: string;
  title: string;
  description: string;
  fieldHref: string;
  missing: (l: Lead) => boolean;
}[] = [
  {
    id: "auto-phone",
    title: "Adicionar telefone de contato",
    description: "Lead sem número de telefone — impossível entrar em contato via WhatsApp.",
    fieldHref: "#contact",
    missing: (l) => !l.phone?.trim(),
  },
  {
    id: "auto-visa-expiry",
    title: "Preencher data de expiração do visto",
    description: "Sem essa data não é possível acompanhar a urgência do processo de visto.",
    fieldHref: "#visa",
    missing: (l) => !l.visaExpiryDate?.trim(),
  },
];

export function getAutoTasks(lead: Lead): AutoTask[] {
  return AUTO_TASK_DEFS
    .filter((def) => def.missing(lead))
    .map((def) => ({
      id: def.id,
      title: def.title,
      completed: false,
      stage: lead.stage,
      auto: true as const,
      fieldHref: def.fieldHref,
    }));
}

export function getAutoTaskDef(id: string) {
  return AUTO_TASK_DEFS.find((d) => d.id === id);
}
