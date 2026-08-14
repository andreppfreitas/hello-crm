"use client";

import Link from "next/link";
import { useCRM } from "@/contexts/CRMContext";
import {
  revenueSummary, revenueBySchool, revenueByMonth,
  leadCommission, billableEnrollments, formatAUD, PHASE_PROBABILITY,
} from "@/lib/commission";
import { STAGE_CONFIG, PHASE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, FileText, CircleAlert, School } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const TOOLTIP_STYLE = { background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 };

export default function ReceitaPage() {
  const { leads: allLeads } = useCRM();
  // Uma oportunidade por grupo — membros de família/casal não contam em dobro
  const leads = allLeads.filter((l) => !l.groupId || l.groupRole === "primary");

  const summary = revenueSummary(leads);
  const bySchool = revenueBySchool(leads);
  const byMonth = revenueByMonth(leads);

  // Alunos que já fecharam e têm comissão a faturar ou faturada
  const openCommissions = leads
    .map((l) => ({ lead: l, c: leadCommission(l) }))
    .filter(({ c }) => c.pending > 0 || c.invoiced > 0)
    .sort((a, b) => (b.c.pending + b.c.invoiced) - (a.c.pending + a.c.invoiced));

  // Alunos com curso fechado mas sem dados de comissão — dinheiro invisível
  const missingData = leads.filter((l) => {
    const enrollments = billableEnrollments(l);
    if (enrollments.length === 0) return false;
    return enrollments.some((e) => !e.tuitionFee?.trim() || !e.commissionRate);
  });

  const kpis = [
    { label: "Recebido", value: summary.received, icon: Wallet, color: "text-emerald-400", bg: "border-emerald-500/30 bg-emerald-500/5" },
    { label: "Faturado (a receber)", value: summary.invoiced, icon: FileText, color: "text-blue-400", bg: "border-blue-500/30 bg-blue-500/5" },
    { label: "Fechado, a faturar", value: summary.pendingClosed, icon: CircleAlert, color: "text-amber-400", bg: "border-amber-500/30 bg-amber-500/5" },
    { label: "Previsão do pipeline", value: summary.forecast, icon: TrendingUp, color: "text-violet-400", bg: "border-violet-500/30 bg-violet-500/5" },
  ];

  const hasData = summary.received + summary.invoiced + summary.pendingClosed + summary.totalPipeline > 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={cn("glass-card rounded-xl p-4 border space-y-2", bg)}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <p className={cn("text-2xl font-bold", color)}>{formatAUD(value)}</p>
          </div>
        ))}
      </div>

      {!hasData && (
        <div className="glass-card rounded-xl p-8 text-center space-y-2">
          <p className="text-sm text-foreground font-medium">Nenhuma comissão registrada ainda.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            No perfil de cada aluno, em <span className="text-foreground">Cursos &amp; Escolas</span>, preencha o
            tuition fee e o percentual de comissão da escola. Com mais de uma opção, marque qual foi a fechada.
          </p>
        </div>
      )}

      {/* Alerta de dados faltando */}
      {missingData.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-amber-500/30 bg-amber-500/5">
          <p className="text-sm font-semibold text-amber-400 mb-2">
            💸 {missingData.length} aluno(s) com curso fechado mas sem dados de comissão
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Esse dinheiro não entra em nenhum número desta página até você preencher tuition e %.
          </p>
          <div className="flex flex-wrap gap-2">
            {missingData.slice(0, 12).map((l) => (
              <Link key={l.id} href={`/leads/${l.id}`}>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors">
                  {l.fullName.split(" ")[0]}
                </span>
              </Link>
            ))}
            {missingData.length > 12 && (
              <span className="text-xs px-2.5 py-1 text-muted-foreground">+{missingData.length - 12}</span>
            )}
          </div>
        </div>
      )}

      {/* Comissão por mês de início do curso */}
      {byMonth.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Comissão por mês de início do curso</h3>
          <p className="text-xs text-muted-foreground mb-4">Baseado na data de início preenchida em cada curso fechado</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMonth}>
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatAUD(Number(v) || 0), "Comissão"]} />
              <Bar dataKey="commission" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Por escola */}
      {bySchool.length > 0 && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-foreground">Comissão por escola</h3>
          </div>
          <div className="space-y-3">
            {bySchool.map((s) => {
              const max = bySchool[0].commission || 1;
              const pctReceived = s.commission > 0 ? Math.round((s.received / s.commission) * 100) : 0;
              return (
                <div key={s.school} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-foreground font-medium truncate">{s.school}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {s.students} aluno{s.students > 1 ? "s" : ""} · {formatAUD(s.commission)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${(s.received / max) * 100}%` }} />
                    <div className="h-full bg-violet-500/60" style={{ width: `${((s.commission - s.received) / max) * 100}%` }} />
                  </div>
                  {s.received > 0 && (
                    <p className="text-[10px] text-emerald-400">{pctReceived}% já recebido</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Recebido</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500/60" /> A receber</span>
          </div>
        </div>
      )}

      {/* Comissões em aberto */}
      {openCommissions.length > 0 && (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Comissões em aberto</h3>
          <div className="space-y-2">
            {openCommissions.map(({ lead, c }) => {
              const phase = STAGE_CONFIG[lead.stage]?.phase ?? "leads";
              return (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/20 border border-border hover:border-primary/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {billableEnrollments(lead).map((e) => e.school).filter(Boolean).join(", ") || "—"}
                        {" · "}
                        <span className={PHASE_CONFIG[phase].color}>{PHASE_CONFIG[phase].label}</span>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">{formatAUD(c.pending + c.invoiced)}</p>
                      <p className={cn("text-[10px]", c.invoiced > 0 ? "text-blue-400" : "text-amber-400")}>
                        {c.invoiced > 0 ? "faturado" : "a faturar"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Como a previsão é calculada */}
      {summary.forecast > 0 && (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Como a previsão é calculada</h3>
          <p className="text-xs text-muted-foreground">
            O pipeline bruto é de {formatAUD(summary.totalPipeline)} em comissões de alunos que ainda não fecharam.
            Cada um é ponderado pela probabilidade da fase em que está:
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PHASE_PROBABILITY) as (keyof typeof PHASE_PROBABILITY)[]).map((p) => (
              <span key={p} className={cn("text-[10px] px-2 py-1 rounded-md border", PHASE_CONFIG[p].headerBg, PHASE_CONFIG[p].color)}>
                {PHASE_CONFIG[p].label} {Math.round(PHASE_PROBABILITY[p] * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
