"use client";

import { useCRM } from "@/contexts/CRMContext";
import { formatDate, isOverdue, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Bell, Check, Trash2, Phone, MessageCircle, Mail, Calendar, Pin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import type { Reminder } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_CONFIG: Record<Reminder["type"], { icon: React.ElementType; label: string; color: string; bg: string }> = {
  call:     { icon: Phone,         label: "Ligação",  color: "text-blue-400",   bg: "bg-blue-500/15" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-emerald-400",bg: "bg-emerald-500/15" },
  email:    { icon: Mail,          label: "E-mail",   color: "text-violet-400", bg: "bg-violet-500/15" },
  meeting:  { icon: Calendar,      label: "Reunião",  color: "text-amber-400",  bg: "bg-amber-500/15" },
  other:    { icon: Pin,           label: "Outro",    color: "text-slate-400",  bg: "bg-slate-500/15" },
};

function ReminderCard({ reminder, onComplete, onDelete }: {
  reminder: Reminder;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const cfg = TYPE_CONFIG[reminder.type];
  const Icon = cfg.icon;
  const overdue = isOverdue(reminder.dueAt) && !reminder.completed;
  const days = daysUntil(reminder.dueAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl border transition-all",
        reminder.completed
          ? "bg-secondary/10 border-border opacity-60"
          : overdue
          ? "bg-red-500/5 border-red-500/20"
          : "glass-card border-border"
      )}
    >
      <div className={cn("p-2 rounded-lg flex-shrink-0 mt-0.5", cfg.bg, cfg.color)}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/leads/${reminder.leadId}`}>
            <span className={cn("text-sm font-medium hover:text-primary transition-colors", reminder.completed && "line-through text-muted-foreground")}>
              {reminder.leadName}
            </span>
          </Link>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
            reminder.completed ? "bg-emerald-500/15 text-emerald-400" :
            overdue ? "bg-red-500/15 text-red-400" :
            days === 0 ? "bg-amber-500/15 text-amber-400" :
            "bg-secondary text-muted-foreground"
          )}>
            {reminder.completed ? "Concluído" : overdue ? `${Math.abs(days)}d atrasado` : days === 0 ? "Hoje" : `em ${days}d`}
          </span>
        </div>

        <p className={cn("text-sm text-muted-foreground", reminder.completed && "line-through")}>
          {reminder.note}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{cfg.label}</span>
          <span>·</span>
          <span>{formatDate(reminder.dueAt, "long")} {reminder.dueAt.slice(11, 16)}</span>
          {reminder.completed && reminder.completedAt && (
            <>
              <span>·</span>
              <span className="text-emerald-400">Feito {formatDate(reminder.completedAt, "relative")}</span>
            </>
          )}
        </div>
      </div>

      {!reminder.completed && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onComplete}
            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            title="Marcar como feito"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function RemindersPage() {
  const { reminders, completeReminder, removeReminder } = useCRM();

  const pending = reminders.filter((r) => !r.completed);
  const done = reminders.filter((r) => r.completed);

  const overdue = pending.filter((r) => isOverdue(r.dueAt));
  const today = pending.filter((r) => !isOverdue(r.dueAt) && daysUntil(r.dueAt) === 0);
  const thisWeek = pending.filter((r) => { const d = daysUntil(r.dueAt); return d > 0 && d <= 7; });
  const upcoming = pending.filter((r) => daysUntil(r.dueAt) > 7);

  function handleComplete(id: string) {
    completeReminder(id);
    toast.success("Lembrete marcado como feito!");
  }

  function handleDelete(id: string) {
    removeReminder(id);
    toast.success("Lembrete removido");
  }

  const Section = ({ title, items, accent }: { title: string; items: Reminder[]; accent?: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold uppercase tracking-wider", accent ?? "text-muted-foreground")}>{title}</span>
          <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", accent ? `${accent} bg-current/10` : "bg-secondary text-muted-foreground")}>
            {items.length}
          </span>
        </div>
        <AnimatePresence mode="popLayout">
          {items.map((r) => (
            <ReminderCard key={r.id} reminder={r} onComplete={() => handleComplete(r.id)} onDelete={() => handleDelete(r.id)} />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/15">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Lembretes</h2>
            <p className="text-sm text-muted-foreground">
              {pending.length} pendentes · {overdue.length > 0 && <span className="text-red-400">{overdue.length} atrasados</span>}
            </p>
          </div>
        </div>
        {pending.length === 0 && done.length === 0 && (
          <p className="text-sm text-muted-foreground">Crie lembretes no perfil de cada lead.</p>
        )}
      </div>

      {/* Pending grouped */}
      {pending.length === 0 && done.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Bell className="w-7 h-7 text-primary" />
          </div>
          <p className="text-foreground font-medium">Nenhum lembrete ainda</p>
          <p className="text-sm text-muted-foreground">Abra o perfil de um lead e clique em "Lembrete" para agendar um follow-up.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="⚠️ Atrasados" items={overdue} accent="text-red-400" />
          <Section title="Hoje" items={today} accent="text-amber-400" />
          <Section title="Esta semana" items={thisWeek} accent="text-primary" />
          <Section title="Próximos" items={upcoming} />
          {done.length > 0 && (
            <details className="space-y-2">
              <summary className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                Concluídos ({done.length})
              </summary>
              <div className="space-y-2 pt-2">
                {done.slice(0, 10).map((r) => (
                  <ReminderCard key={r.id} reminder={r} onComplete={() => {}} onDelete={() => handleDelete(r.id)} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
