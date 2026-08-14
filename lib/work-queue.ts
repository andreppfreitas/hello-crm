import type { Lead, Reminder, NextAction, PipelineStage } from "@/types";
import { STAGE_CONFIG, NEXT_ACTION_CONFIG, WAITING_FOR_CONFIG, PHASE_ORDER, PHASE_CONFIG } from "./constants";
import { openChainTask, chainProgress } from "./task-chain";

/**
 * Fila única de trabalho do consultor.
 *
 * O dashboard antigo espalhava o mesmo trabalho por cinco caixas (lembretes,
 * vistos vencendo, travados, sem contato, próxima ação) e obrigava a pessoa a
 * juntar tudo de cabeça. Aqui as fontes são fundidas numa lista só, ordenada
 * por urgência, com o motivo explícito em cada linha.
 */

export type QueueKind = "step" | "reminder" | "visa" | "stuck" | "action" | "silent";

export interface QueueItem {
  id: string;
  leadId: string;
  leadName: string;
  phone?: string;
  kind: QueueKind;
  icon: string;
  /** O que precisa ser feito. */
  task: string;
  /** Por que está na fila (prazo, tempo parado…). */
  reason: string;
  urgency: number;
  overdue: boolean;
  /** Id da task, quando o item vem de um passo da corrente. */
  taskId?: string;
}

export const KIND_LABEL: Record<QueueKind, string> = {
  step: "Passos do processo",
  reminder: "Lembretes",
  visa: "Vistos",
  stuck: "Travados",
  action: "Próxima ação",
  silent: "Sem contato",
};

const DAY = 86400000;
const daysBetween = (from: number, to: number) => Math.floor((to - from) / DAY);

/** Último sinal de contato real — edição de campo não conta. */
function lastTouch(lead: Lead): number {
  const candidates = [
    lead.createdAt ? new Date(lead.createdAt).getTime() : 0,
    lead.lastContactAt ? new Date(lead.lastContactAt).getTime() : 0,
    ...(lead.stageChanges ?? []).map((s) => new Date(s.changedAt).getTime()),
    ...(lead.notesList ?? []).map((n) => new Date(n.createdAt).getTime()),
    ...(lead.contactHistory ?? []).map((c) => new Date(c.date).getTime()),
  ].filter((t) => t > 0);
  return candidates.length ? Math.max(...candidates) : 0;
}

export function buildWorkQueue(leads: Lead[], reminders: Reminder[], now = Date.now()): QueueItem[] {
  const items: QueueItem[] = [];
  const byId = new Map(leads.map((l) => [l.id, l]));
  // Uma linha por oportunidade — membro de casal/família não duplica
  const active = leads.filter((l) => !l.groupId || l.groupRole === "primary");
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

  // 1. Lembretes vencidos ou de hoje — o compromisso mais explícito que existe
  for (const r of reminders) {
    if (r.completed) continue;
    const due = new Date(r.dueAt).getTime();
    if (due > endOfToday.getTime()) continue;
    const late = daysBetween(due, now);
    const isLate = late > 0;
    items.push({
      id: `rem-${r.id}`,
      leadId: r.leadId,
      leadName: r.leadName,
      phone: byId.get(r.leadId)?.phone,
      kind: "reminder",
      icon: r.type === "call" ? "📞" : r.type === "whatsapp" ? "💬" : r.type === "email" ? "📧" : r.type === "meeting" ? "📅" : "📌",
      task: r.note,
      reason: isLate ? `atrasado ${late}d` : "para hoje",
      urgency: isLate ? 100 + Math.min(late, 60) : 80,
      overdue: isLate,
    });
  }

  const withReminder = new Set(items.map((i) => i.leadId));

  for (const lead of active) {
    const phase = STAGE_CONFIG[lead.stage]?.phase;

    // 2. Visto vencendo — prazo legal, não espera
    const snoozed = lead.visaAlertSnoozedUntil
      ? new Date(lead.visaAlertSnoozedUntil).getTime() > now
      : false;
    if (lead.visaExpiryDate && phase !== "visa" && !snoozed) {
      const left = daysBetween(now, new Date(lead.visaExpiryDate).getTime());
      if (left <= 30) {
        items.push({
          id: `visa-${lead.id}`,
          leadId: lead.id,
          leadName: lead.fullName,
          phone: lead.phone,
          kind: "visa",
          icon: "🛂",
          task: left < 0 ? `Visto VENCIDO há ${Math.abs(left)}d` : `Visto vence em ${left}d`,
          reason: lead.currentVisaType || "sem tipo de visto registrado",
          urgency: left <= 7 ? 95 : 70,
          overdue: left <= 7,
        });
      }
    }

    // Quem já tem lembrete não precisa aparecer de novo pelos motivos fracos
    if (withReminder.has(lead.id)) continue;
    if (phase === "visa" || lead.temperature === "closed") continue;

    const touched = lastTouch(lead);
    const silentDays = touched ? daysBetween(touched, now) : 0;

    // 3. Passo aberto da corrente do processo — é o "o que fazer" mais concreto
    // que existe, então substitui travado/próxima ação/silêncio.
    const step = openChainTask(lead);
    if (step) {
      const { done, total } = chainProgress(lead);
      items.push({
        id: `step-${lead.id}`,
        leadId: lead.id,
        leadName: lead.fullName,
        phone: lead.phone,
        kind: "step",
        icon: "✅",
        task: step.title,
        reason: `${STAGE_CONFIG[lead.stage]?.label} · passo ${Math.min(done + 1, total)}/${total}`,
        urgency: 45 + Math.min(silentDays, 25),
        overdue: silentDays > 14,
        taskId: step.id,
      });
      continue;
    }

    // 3. Travado esperando terceiro
    if (lead.waitingFor && silentDays > 3) {
      const cfg = WAITING_FOR_CONFIG[lead.waitingFor];
      items.push({
        id: `stuck-${lead.id}`,
        leadId: lead.id,
        leadName: lead.fullName,
        phone: lead.phone,
        kind: "stuck",
        icon: "⏳",
        task: `Cobrar retorno${cfg ? ` — ${cfg.icon} ${cfg.label}` : ""}`,
        reason: `parado há ${silentDays}d`,
        urgency: 60 + Math.min(silentDays, 30),
        overdue: silentDays > 14,
      });
      continue;
    }

    // 4. Próxima ação definida
    if (lead.nextAction) {
      const cfg = NEXT_ACTION_CONFIG[lead.nextAction as NonNullable<NextAction>];
      if (cfg) {
        items.push({
          id: `act-${lead.id}`,
          leadId: lead.id,
          leadName: lead.fullName,
          phone: lead.phone,
          kind: "action",
          icon: cfg.icon,
          task: cfg.label,
          reason: silentDays > 0 ? `sem contato há ${silentDays}d` : "definida agora",
          urgency: 50 + Math.min(silentDays, 20),
          overdue: silentDays > 14,
        });
        continue;
      }
    }

    // 5. Silêncio prolongado sem nada agendado
    if (silentDays > 7) {
      items.push({
        id: `silent-${lead.id}`,
        leadId: lead.id,
        leadName: lead.fullName,
        phone: lead.phone,
        kind: "silent",
        icon: "💤",
        task: "Retomar contato",
        reason: lead.lastContactAt ? `sem contato há ${silentDays}d` : "nunca contatado",
        urgency: 30 + Math.min(silentDays, 20),
        overdue: silentDays > 21,
      });
    }
  }

  return items.sort((a, b) => b.urgency - a.urgency || a.leadName.localeCompare(b.leadName));
}

/** Sequência linear de todos os estágios, na ordem do pipeline. */
export const STAGE_SEQUENCE: PipelineStage[] = PHASE_ORDER.flatMap(
  (phase) => PHASE_CONFIG[phase].stages
);

/** Próximo estágio do fluxo, ou null se já está no fim. */
export function nextStage(current: PipelineStage): PipelineStage | null {
  const i = STAGE_SEQUENCE.indexOf(current);
  return i >= 0 && i < STAGE_SEQUENCE.length - 1 ? STAGE_SEQUENCE[i + 1] : null;
}

export function queueCounts(items: QueueItem[]): Record<QueueKind, number> {
  const counts = { step: 0, reminder: 0, visa: 0, stuck: 0, action: 0, silent: 0 };
  for (const i of items) counts[i.kind] += 1;
  return counts;
}
