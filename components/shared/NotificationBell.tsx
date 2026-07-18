"use client";

import { useState, useEffect, useRef } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { STAGE_CONFIG } from "@/lib/constants";
import { isOverdue, formatDate } from "@/lib/utils";
import { Bell } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import Link from "next/link";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { leads, reminders } = useCRM();
  const ref = useRef<HTMLDivElement>(null);
  const now = new Date();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Overdue reminders
  const overdueReminders = reminders
    .filter((r) => !r.completed && isOverdue(r.dueAt))
    .slice(0, 5);

  // Hot leads in early phases with no contact 7+ days
  const EARLY_PHASES = new Set(["leads", "qualifying", "proposal"]);
  const hotNoContact = leads.filter((l) => {
    if (l.temperature !== "hot") return false;
    if (!EARLY_PHASES.has(STAGE_CONFIG[l.stage]?.phase)) return false;
    const candidates = [
      l.createdAt, l.updatedAt, l.lastContactAt,
      ...(l.stageChanges ?? []).map((s) => s.changedAt),
      ...(l.notesList ?? []).map((n) => n.createdAt),
    ].filter(Boolean).map((d) => new Date(d!).getTime());
    const mostRecent = Math.max(...candidates);
    return (now.getTime() - mostRecent) / 86400000 >= 7;
  }).slice(0, 5);

  const total = overdueReminders.length + hotNoContact.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <Bell className="w-4 h-4" />
        {total > 0 && (
          <span className="absolute top-2 right-2 min-w-[14px] h-[14px] bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 glass-card rounded-xl border border-border shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            {total > 0 && (
              <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-medium">{total}</span>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {total === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Tudo em dia! ✅
              </div>
            )}

            {overdueReminders.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Lembretes atrasados
                </p>
                {overdueReminders.map((r) => (
                  <Link key={r.id} href={`/leads/${r.leadId}`} onClick={() => setOpen(false)}>
                    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold flex-shrink-0 mt-0.5">
                        {initials(r.leadName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{r.leadName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.note}</p>
                        <p className="text-[10px] text-red-400 mt-0.5">{formatDate(r.dueAt, "relative")}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}

            {hotNoContact.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Hot leads sem contato (7+ dias)
                </p>
                {hotNoContact.map((lead) => {
                  const candidates = [
                    lead.createdAt, lead.updatedAt, lead.lastContactAt,
                    ...(lead.stageChanges ?? []).map((s) => s.changedAt),
                  ].filter(Boolean).map((d) => new Date(d!).getTime());
                  const days = Math.floor((now.getTime() - Math.max(...candidates)) / 86400000);
                  return (
                    <Link key={lead.id} href={`/leads/${lead.id}`} onClick={() => setOpen(false)}>
                      <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0 mt-0.5">
                          {initials(lead.fullName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{lead.fullName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{STAGE_CONFIG[lead.stage]?.label ?? lead.stage}</p>
                          <p className="text-[10px] text-orange-400 mt-0.5">{days}d sem atividade</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </div>

          {total > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <Link
                href="/briefing"
                onClick={() => setOpen(false)}
                className="text-xs text-primary hover:underline"
              >
                Ver briefing completo →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
