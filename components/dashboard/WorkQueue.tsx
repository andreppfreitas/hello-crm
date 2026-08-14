"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Lead, Reminder } from "@/types";
import { buildWorkQueue, queueCounts, KIND_LABEL, type QueueKind } from "@/lib/work-queue";
import { cn } from "@/lib/utils";
import { MessageCircle, ChevronRight, Check } from "lucide-react";

const KIND_STYLE: Record<QueueKind, string> = {
  reminder: "bg-primary/15 text-primary border-primary/30",
  visa: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  stuck: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  action: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  silent: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const PAGE = 12;

interface Props {
  leads: Lead[];
  reminders: Reminder[];
  onCompleteReminder?: (id: string) => void;
}

export function WorkQueue({ leads, reminders, onCompleteReminder }: Props) {
  const [filter, setFilter] = useState<QueueKind | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const queue = useMemo(() => buildWorkQueue(leads, reminders), [leads, reminders]);
  const counts = useMemo(() => queueCounts(queue), [queue]);

  const filtered = filter === "all" ? queue : queue.filter((i) => i.kind === filter);
  const visible = filtered.slice(0, limit);
  const overdueCount = queue.filter((i) => i.overdue).length;

  function openWhatsApp(phone: string | undefined) {
    if (!phone) return;
    const raw = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${raw.startsWith("55") ? raw : `55${raw}`}`, "_blank");
  }

  if (queue.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center space-y-1">
        <p className="text-2xl">🎉</p>
        <p className="text-sm font-medium text-foreground">Fila vazia. Nada pendente agora.</p>
        <p className="text-xs text-muted-foreground">Lembretes, vistos e leads parados aparecem aqui automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Cabeçalho + filtros */}
      <div className="p-4 sm:p-5 border-b border-border space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">Fila de trabalho</h2>
          {overdueCount > 0 && (
            <span className="text-xs text-red-400 font-medium">{overdueCount} em atraso</span>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => { setFilter("all"); setLimit(PAGE); }}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap flex-shrink-0 transition-colors",
              filter === "all" ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
            )}
          >
            Tudo <span className="opacity-60">{queue.length}</span>
          </button>
          {(Object.keys(KIND_LABEL) as QueueKind[]).filter((k) => counts[k] > 0).map((k) => (
            <button
              key={k}
              onClick={() => { setFilter(k); setLimit(PAGE); }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap flex-shrink-0 transition-colors",
                filter === k ? KIND_STYLE[k] : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {KIND_LABEL[k]} <span className="opacity-60">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Linhas */}
      <div className="divide-y divide-border">
        {visible.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-white/[0.02] transition-colors group">
            <span className="text-lg flex-shrink-0 w-6 text-center">{item.icon}</span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <Link href={`/leads/${item.leadId}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  {item.leadName}
                </Link>
                <span className={cn("text-xs", item.overdue ? "text-red-400 font-medium" : "text-muted-foreground")}>
                  {item.reason}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{item.task}</p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {item.kind === "reminder" && onCompleteReminder && (
                <button
                  onClick={() => onCompleteReminder(item.id.replace(/^rem-/, ""))}
                  title="Marcar como feito"
                  className="p-2 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {item.phone && (
                <button
                  onClick={() => openWhatsApp(item.phone)}
                  title="Abrir WhatsApp"
                  className="p-2 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}
              <Link
                href={`/leads/${item.leadId}`}
                title="Abrir perfil"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filtered.length > limit && (
        <button
          onClick={() => setLimit((l) => l + PAGE)}
          className="w-full py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.02] transition-colors border-t border-border"
        >
          Mostrar mais {Math.min(PAGE, filtered.length - limit)} de {filtered.length - limit} restantes
        </button>
      )}
    </div>
  );
}
