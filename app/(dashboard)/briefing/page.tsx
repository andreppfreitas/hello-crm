"use client";

import { useCRM } from "@/contexts/CRMContext";
import { formatDate, isOverdue, daysUntil, formatCurrency } from "@/lib/utils";
import { STAGE_CONFIG } from "@/lib/constants";
import { computeScore, scoreColor, scoreBarColor } from "@/lib/scoring";
import { getAutoTasks } from "@/lib/auto-tasks";
import { StageBadge } from "@/components/shared/StageBadge";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { cn, initials } from "@/lib/utils";
import Link from "next/link";
import {
  AlertTriangle, Flame, Clock, CreditCard, TrendingDown,
  CheckSquare, Calendar, Bell, Sparkles, ClipboardList,
} from "lucide-react";

function SectionCard({ icon: Icon, title, color, count, children }: {
  icon: React.ElementType;
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className={cn("flex items-center justify-between px-5 py-3.5 border-b border-border/50", `bg-${color}-500/5`)}>
        <div className="flex items-center gap-2.5">
          <Icon className={cn("w-4 h-4", `text-${color}-400`)} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", `bg-${color}-500/15 text-${color}-300`)}>{count}</span>
      </div>
      <div className="p-3 space-y-1.5">{children}</div>
    </div>
  );
}

function LeadRow({ lead, meta }: { lead: ReturnType<typeof useCRM>["leads"][0]; meta?: React.ReactNode }) {
  const score = computeScore(lead);
  return (
    <Link href={`/leads/${lead.id}`}>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
          {initials(lead.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{lead.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{STAGE_CONFIG[lead.stage]?.label ?? lead.stage}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TemperatureBadge temp={lead.temperature} />
          {meta}
        </div>
      </div>
    </Link>
  );
}

export default function BriefingPage() {
  const { leads, reminders } = useCRM();
  const now = new Date();

  // 1. Hot leads without REAL activity in 7+ days
  // "Activity" = lastContactAt OR updatedAt OR stageChange OR note — whichever is most recent.
  // Leads in advanced phases (enrollment/payments/visa/closed) are excluded — they're clearly active.
  const EARLY_PHASES = new Set(["leads", "qualifying", "proposal"]);
  const hotNoContact = leads.filter((l) => {
    if (l.temperature !== "hot") return false;
    // Skip leads already deep in the pipeline — they've obviously been worked on
    const phase = STAGE_CONFIG[l.stage]?.phase;
    if (!EARLY_PHASES.has(phase)) return false;

    const candidates: number[] = [
      l.createdAt ? new Date(l.createdAt).getTime() : 0,
      l.updatedAt ? new Date(l.updatedAt).getTime() : 0,
      l.lastContactAt ? new Date(l.lastContactAt).getTime() : 0,
      ...(l.stageChanges ?? []).map((sc) => new Date(sc.changedAt).getTime()),
      ...(l.notesList ?? []).map((n) => new Date(n.createdAt).getTime()),
      ...(l.contactHistory ?? []).map((c) => new Date(c.date).getTime()),
    ].filter((t) => t > 0);

    const mostRecent = Math.max(...candidates);
    const days = (now.getTime() - mostRecent) / 86400000;
    return days >= 7;
  });

  // 2. Overdue tasks — exclude visa phase (Em Processo de Visto)
  const overdueTaskLeads = leads.filter((l) => {
    if (STAGE_CONFIG[l.stage]?.phase === "visa") return false;
    return l.tasks.some((t) => !t.completed && t.dueDate && isOverdue(t.dueDate));
  });

  // 3. Payments due this week
  const paymentsDueThisWeek = leads.filter((l) =>
    l.payments.some((p) => {
      if (p.status !== "pending" || !p.dueDate) return false;
      const d = daysUntil(p.dueDate);
      return d >= 0 && d <= 7;
    })
  );

  // 4. Leads stuck in same stage > 14 days — exclude visa phase and closed
  const stuckLeads = leads.filter((l) => {
    if (STAGE_CONFIG[l.stage]?.phase === "visa") return false;
const entry = l.stageHistory.find((h) => h.stage === l.stage && !h.exitedAt);
    if (!entry) return false;
    const days = (now.getTime() - new Date(entry.enteredAt).getTime()) / 86400000;
    return days > 14;
  });

  // 5. Meetings this week
  const meetingsThisWeek = leads.filter((l) => l.stage === "meeting_scheduled");

  // 6. Overdue reminders
  const overdueReminders = reminders.filter((r) => !r.completed && isOverdue(r.dueAt));

  // 7. Leads in visa stage — action needed
  const visaLeads = leads.filter((l) =>
    ["visa_lodged", "medical_requested", "visa_granted"].includes(l.stage)
  );

  // 8. Leads with missing required data (auto tasks)
  const incompleteLeads = leads.filter((l) => getAutoTasks(l).length > 0);

  const totalActions = hotNoContact.length + overdueTaskLeads.length + paymentsDueThisWeek.length + stuckLeads.length + overdueReminders.length + incompleteLeads.length;

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 space-y-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-primary/15">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Briefing Semanal</h2>
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
          </div>
        </div>

        {totalActions === 0 ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckSquare className="w-4 h-4" />
            <span className="text-sm font-medium">Tudo em dia! Nenhuma ação urgente.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Ações urgentes", value: totalActions, color: "text-red-400" },
              { label: "Lembretes atrasados", value: overdueReminders.length, color: "text-orange-400" },
              { label: "Pagamentos esta semana", value: paymentsDueThisWeek.length, color: "text-amber-400" },
              { label: "Leads no visa", value: visaLeads.length, color: "text-cyan-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-secondary/30 rounded-xl p-3 text-center">
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1. Overdue reminders */}
      <SectionCard icon={Bell} title="Lembretes Atrasados" color="red" count={overdueReminders.length}>
        {overdueReminders.slice(0, 8).map((r) => (
          <Link key={r.id} href={`/leads/${r.leadId}`}>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {initials(r.leadName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.leadName}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.note}</p>
                </div>
              </div>
              <span className="text-xs text-red-400 flex-shrink-0">{Math.abs(daysUntil(r.dueAt))}d atrasado</span>
            </div>
          </Link>
        ))}
      </SectionCard>

      {/* 2. Hot leads no contact */}
      <SectionCard icon={Flame} title="Hot Leads sem Atividade (7+ dias)" color="red" count={hotNoContact.length}>
        {hotNoContact.slice(0, 8).map((lead) => {
          const candidates: number[] = [
            lead.createdAt ? new Date(lead.createdAt).getTime() : 0,
            lead.updatedAt ? new Date(lead.updatedAt).getTime() : 0,
            lead.lastContactAt ? new Date(lead.lastContactAt).getTime() : 0,
            ...(lead.stageChanges ?? []).map((sc) => new Date(sc.changedAt).getTime()),
          ].filter((t) => t > 0);
          const mostRecent = Math.max(...candidates);
          const days = Math.floor((now.getTime() - mostRecent) / 86400000);
          return (
            <LeadRow key={lead.id} lead={lead} meta={
              <span className="text-xs text-red-400">{days}d sem atividade</span>
            } />
          );
        })}
      </SectionCard>

      {/* 3. Overdue tasks */}
      <SectionCard icon={CheckSquare} title="Tarefas Vencidas" color="orange" count={overdueTaskLeads.length}>
        {overdueTaskLeads.slice(0, 8).map((lead) => {
          const overdueTasks = lead.tasks.filter((t) => !t.completed && t.dueDate && isOverdue(t.dueDate));
          return (
            <LeadRow key={lead.id} lead={lead} meta={
              <span className="text-xs text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full">
                {overdueTasks.length} tarefa{overdueTasks.length > 1 ? "s" : ""} atrasada{overdueTasks.length > 1 ? "s" : ""}
              </span>
            } />
          );
        })}
      </SectionCard>

      {/* 4. Payments this week */}
      <SectionCard icon={CreditCard} title="Pagamentos Vencendo Esta Semana" color="amber" count={paymentsDueThisWeek.length}>
        {paymentsDueThisWeek.slice(0, 8).map((lead) => {
          const upcoming = lead.payments.filter((p) => p.status === "pending" && p.dueDate && daysUntil(p.dueDate) >= 0 && daysUntil(p.dueDate) <= 7);
          const total = upcoming.reduce((s, p) => s + p.amount, 0);
          return (
            <LeadRow key={lead.id} lead={lead} meta={
              <span className="text-xs text-amber-400 font-medium">{formatCurrency(total)}</span>
            } />
          );
        })}
      </SectionCard>

      {/* 5. Stuck leads */}
      <SectionCard icon={TrendingDown} title="Leads Travados (14+ dias no mesmo estágio)" color="slate" count={stuckLeads.length}>
        {stuckLeads.slice(0, 8).map((lead) => {
          const entry = lead.stageHistory.find((h) => h.stage === lead.stage && !h.exitedAt);
          const days = entry ? Math.floor((now.getTime() - new Date(entry.enteredAt).getTime()) / 86400000) : 0;
          return (
            <LeadRow key={lead.id} lead={lead} meta={
              <span className="text-xs text-muted-foreground">{days}d neste estágio</span>
            } />
          );
        })}
      </SectionCard>

      {/* 6. Meetings scheduled */}
      <SectionCard icon={Calendar} title="Reuniões Agendadas" color="violet" count={meetingsThisWeek.length}>
        {meetingsThisWeek.slice(0, 8).map((lead) => (
          <LeadRow key={lead.id} lead={lead} />
        ))}
      </SectionCard>

      {/* 7. Visa leads */}
      <SectionCard icon={AlertTriangle} title="Leads no Processo de Visto" color="cyan" count={visaLeads.length}>
        {visaLeads.slice(0, 8).map((lead) => (
          <LeadRow key={lead.id} lead={lead} />
        ))}
      </SectionCard>

      {/* 8. Incomplete profiles */}
      <SectionCard icon={ClipboardList} title="Dados Incompletos" color="amber" count={incompleteLeads.length}>
        {incompleteLeads.slice(0, 8).map((lead) => {
          const autoTasks = getAutoTasks(lead);
          return (
            <LeadRow key={lead.id} lead={lead} meta={
              <span className="text-xs text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                {autoTasks.map((t) => t.title).join(" · ")}
              </span>
            } />
          );
        })}
      </SectionCard>

      {totalActions === 0 && meetingsThisWeek.length === 0 && visaLeads.length === 0 && incompleteLeads.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-foreground font-medium">Nenhuma ação pendente</p>
          <p className="text-sm text-muted-foreground">Seus leads estão todos em dia. Ótimo trabalho! 🎉</p>
        </div>
      )}
    </div>
  );
}
