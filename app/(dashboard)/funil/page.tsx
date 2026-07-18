"use client";

import { useCRM } from "@/contexts/CRMContext";
import { PHASE_ORDER, PHASE_CONFIG, STAGE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";

// For each phase, compute how many unique leads ever reached it (have stageHistory entry for any stage in that phase)
function usePhaseMetrics(leads: ReturnType<typeof useCRM>["leads"]) {
  const now = Date.now();

  return PHASE_ORDER.map((phase) => {
    const phaseStages = new Set(PHASE_CONFIG[phase].stages);

    // Leads that ever entered this phase
    const everReached = leads.filter((l) =>
      l.stageHistory.some((h) => phaseStages.has(h.stage as never))
    );

    // Currently in this phase
    const current = leads.filter((l) => STAGE_CONFIG[l.stage]?.phase === phase);

    // Avg days spent in this phase (only leads that have exited it)
    const durations: number[] = [];
    for (const lead of leads) {
      const entries = lead.stageHistory.filter((h) => phaseStages.has(h.stage as never));
      for (const entry of entries) {
        const exit = entry.exitedAt ? new Date(entry.exitedAt).getTime() : now;
        durations.push((exit - new Date(entry.enteredAt).getTime()) / 86400000);
      }
    }
    const avgDays = durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 0;

    return { phase, cfg: PHASE_CONFIG[phase], everReached: everReached.length, current: current.length, avgDays };
  });
}

export default function FunilPage() {
  const { leads: allLeads } = useCRM();
  // Only primaries
  const leads = allLeads.filter((l) => !l.groupId || l.groupRole === "primary");
  const metrics = usePhaseMetrics(leads);
  const maxEver = Math.max(...metrics.map((m) => m.everReached), 1);

  // Top slowest stages (avg days > 0)
  const now = Date.now();
  const stageMetrics = PHASE_ORDER.flatMap((phase) =>
    PHASE_CONFIG[phase].stages.map((stage) => {
      const durations: number[] = leads.flatMap((l) =>
        l.stageHistory
          .filter((h) => h.stage === stage)
          .map((h) => {
            const exit = h.exitedAt ? new Date(h.exitedAt).getTime() : now;
            return (exit - new Date(h.enteredAt).getTime()) / 86400000;
          })
      );
      const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      return { stage, label: STAGE_CONFIG[stage]?.label ?? stage, phase, avg: Math.round(avg * 10) / 10, count: durations.length };
    })
  ).filter((s) => s.avg > 0).sort((a, b) => b.avg - a.avg).slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Funil de Conversão</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Quantos leads chegaram em cada fase — e quanto tempo ficam parados.
        </p>
      </div>

      {/* Phase funnel */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Leads por fase</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total de leads únicos que já passaram por cada fase</p>
        </div>
        <div className="p-5 space-y-3">
          {metrics.map(({ phase, cfg, everReached, current, avgDays }, i) => {
            const prev = i > 0 ? metrics[i - 1].everReached : everReached;
            const dropPct = prev > 0 ? Math.round((everReached / prev) * 100) : 100;
            const barWidth = maxEver > 0 ? (everReached / maxEver) * 100 : 0;
            const isVisa = phase === "visa";

            return (
              <div key={phase} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn("font-semibold", cfg.color, isVisa && "flex items-center gap-1")}>
                    {isVisa && "🛂 "}{cfg.label}
                  </span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    {avgDays > 0 && (
                      <span className={cn("text-[11px]", avgDays > 14 ? "text-red-400" : avgDays > 7 ? "text-amber-400" : "text-muted-foreground")}>
                        ⏱ {avgDays}d média
                      </span>
                    )}
                    {current > 0 && (
                      <span className="text-[11px] bg-white/5 px-2 py-0.5 rounded-full">
                        {current} atual{current !== 1 ? "is" : ""}
                      </span>
                    )}
                    {i > 0 && (
                      <span className={cn("text-[11px] font-medium w-12 text-right", dropPct < 50 ? "text-red-400" : dropPct < 75 ? "text-amber-400" : "text-emerald-400")}>
                        {dropPct}%
                      </span>
                    )}
                    <span className="font-bold text-foreground w-6 text-right">{everReached}</span>
                  </div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", isVisa ? "bg-emerald-500/70" : "bg-primary/60")}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                {i > 0 && dropPct < 60 && everReached > 0 && (
                  <p className="text-[10px] text-red-400 pl-1">
                    ⚠️ {100 - dropPct}% dos leads não chegaram aqui — gargalo potencial
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-border bg-secondary/10 flex items-center gap-6 text-[11px] text-muted-foreground flex-wrap">
          <span>% = conversão em relação à fase anterior</span>
          <span className="text-emerald-400">verde ≥ 75%</span>
          <span className="text-amber-400">amarelo 50–74%</span>
          <span className="text-red-400">vermelho &lt; 50%</span>
        </div>
      </div>

      {/* Slowest stages table */}
      {stageMetrics.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Estágios mais lentos</p>
            <p className="text-xs text-muted-foreground mt-0.5">Onde os leads ficam parados mais tempo em média</p>
          </div>
          <div className="divide-y divide-border/40">
            {stageMetrics.map(({ stage, label, phase, avg, count }, i) => {
              const phaseCfg = PHASE_CONFIG[phase];
              const maxAvg = stageMetrics[0].avg;
              return (
                <div key={stage} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-sm font-bold text-muted-foreground/50 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{label}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded", phaseCfg.headerBg, phaseCfg.color)}>{phaseCfg.label}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", avg > 14 ? "bg-red-500/60" : avg > 7 ? "bg-amber-500/60" : "bg-primary/50")}
                        style={{ width: `${(avg / maxAvg) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className={cn("text-sm font-bold", avg > 14 ? "text-red-400" : avg > 7 ? "text-amber-400" : "text-foreground")}>
                      {avg}d
                    </p>
                    <p className="text-[10px] text-muted-foreground">{count} lead{count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-border bg-secondary/10 text-[11px] text-muted-foreground">
            Média calculada sobre leads que já saíram do estágio. Estágios com 0 leads passados não aparecem.
          </div>
        </div>
      )}

      {stageMetrics.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <p className="text-sm">Sem histórico de estágios ainda.</p>
          <p className="text-xs mt-1">Conforme os leads avançarem no pipeline, os dados aparecerão aqui.</p>
        </div>
      )}

      <div className="text-center">
        <Link href="/reports" className="text-xs text-primary hover:underline">
          Ver relatórios completos →
        </Link>
      </div>
    </div>
  );
}
