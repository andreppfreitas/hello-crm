"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCRM } from "@/contexts/CRMContext";
import { CONSULTANTS, STAGE_CONFIG } from "@/lib/constants";
import { buildWorkQueue } from "@/lib/work-queue";
import { WorkQueue } from "@/components/dashboard/WorkQueue";
import { cn } from "@/lib/utils";
import { BarChart3, ChevronRight } from "lucide-react";

/**
 * Dashboard focado na operação do consultor: o que fazer agora.
 * Gráficos e distribuições moram em /reports, /funil e /receita.
 */
export default function DashboardPage() {
  const { leads, reminders, completeReminder } = useCRM();
  const [showAllVisa, setShowAllVisa] = useState(false);

  const now = Date.now();
  const queue = useMemo(() => buildWorkQueue(leads, reminders), [leads, reminders]);

  // Uma oportunidade por grupo
  const active = leads.filter((l) => !l.groupId || l.groupRole === "primary");
  const inVisa = active.filter((l) => STAGE_CONFIG[l.stage]?.phase === "visa");

  const overdue = queue.filter((i) => i.overdue).length;
  const newThisWeek = leads.filter((l) => l.createdAt && now - new Date(l.createdAt).getTime() < 7 * 86400000).length;

  const daysInStage = (l: (typeof leads)[number]) => {
    const entry = l.stageHistory?.find((h) => h.stage === l.stage && !h.exitedAt);
    return entry ? Math.floor((now - new Date(entry.enteredAt).getTime()) / 86400000) : null;
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = CONSULTANTS[0]?.split(" ")[0] ?? "";

  const strip = [
    { label: "Na fila", value: queue.length, tone: "text-foreground" },
    { label: "Em atraso", value: overdue, tone: overdue > 0 ? "text-red-400" : "text-muted-foreground" },
    { label: "Em processo de visto", value: inVisa.length, tone: "text-emerald-400" },
    { label: "Novos essa semana", value: newThisWeek, tone: "text-blue-400" },
  ];

  return (
    <div className="space-y-5">
      {/* Saudação */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{greeting}, {firstName} 👋</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {queue.length === 0
            ? "Tudo em dia por aqui. ✨"
            : <>Você tem <span className="text-foreground font-semibold">{queue.length} {queue.length === 1 ? "item" : "itens"}</span> na fila
                {overdue > 0 && <>, sendo <span className="text-red-400 font-semibold">{overdue} em atraso</span></>}.</>}
        </p>
      </div>

      {/* Faixa compacta de números — só o que é operacional */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {strip.map(({ label, value, tone }) => (
          <div key={label} className="glass-card rounded-xl px-4 py-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider truncate">{label}</p>
            <p className={cn("text-2xl font-bold mt-0.5", tone)}>{value}</p>
          </div>
        ))}
      </div>

      {/* O coração da página */}
      <WorkQueue leads={leads} reminders={reminders} onCompleteReminder={completeReminder} />

      {/* Em processo de visto — acompanhamento, não ação */}
      {inVisa.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-emerald-500/25 bg-emerald-500/5">
          <p className="text-sm font-semibold text-emerald-400 mb-2">
            🛂 {inVisa.length} estudante(s) em processo de visto
          </p>
          <div className="flex flex-wrap gap-2">
            {(showAllVisa ? inVisa : inVisa.slice(0, 6)).map((l) => (
              <Link key={l.id} href={`/leads/${l.id}`}>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors">
                  {l.fullName.split(" ")[0]} · {STAGE_CONFIG[l.stage]?.label}
                  {(() => { const d = daysInStage(l); return d !== null && d > 0 ? ` · ${d}d` : ""; })()}
                </span>
              </Link>
            ))}
            {inVisa.length > 6 && (
              <button
                onClick={() => setShowAllVisa((v) => !v)}
                className="text-xs px-2.5 py-1 rounded-full text-emerald-400 border border-dashed border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
              >
                {showAllVisa ? "Mostrar menos" : `Mostrar todas (+${inVisa.length - 6})`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Atalho para a parte analítica */}
      <Link href="/reports">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors group">
          <div className="p-2 rounded-lg bg-violet-500/15 text-violet-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Números e gráficos</p>
            <p className="text-xs text-muted-foreground">
              Cidades, cursos, escolas, conversão e desempenho ficam em Relatórios
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </Link>
    </div>
  );
}
