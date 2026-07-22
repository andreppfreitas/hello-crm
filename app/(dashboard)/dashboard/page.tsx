"use client";

import { useCRM } from "@/contexts/CRMContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { StatCard } from "@/components/shared/StatCard";
import { StageBadge } from "@/components/shared/StageBadge";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { formatDate } from "@/lib/utils";
import { CITIES, COURSES, CONSULTANTS, STAGE_CONFIG, NEXT_ACTION_CONFIG, WAITING_FOR_CONFIG } from "@/lib/constants";
import {
  Users, Flame, MessageSquare, Calendar, FileText,
  CreditCard, Globe,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import Link from "next/link";

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#f43f5e", "#06b6d4", "#84cc16"];

export default function DashboardPage() {
  const { stats, leads, reminders } = useCRM();
  const { t } = useLanguage();

  const AU_CITIES = ["Sydney", "Melbourne", "Brisbane", "Gold Coast", "Adelaide", "Canberra", "Perth"];
  const cityData = [
    ...AU_CITIES.map((city) => ({
      city,
      count: leads.filter((l) => l.currentCity?.toLowerCase().includes(city.toLowerCase())).length,
    })),
    {
      city: "Outros",
      count: leads.filter((l) => {
        if (l.isOffshore) return false;
        const city = l.currentCity?.toLowerCase() ?? "";
        return city && !AU_CITIES.some((c) => city.includes(c.toLowerCase()));
      }).length,
    },
    {
      city: "Offshore",
      count: leads.filter((l) => l.isOffshore).length,
    },
  ];

  const consultantData = CONSULTANTS.map((name) => {
    const mine = leads.filter((l) => l.assignedConsultant === name);
    const closed = mine.filter((l) => STAGE_CONFIG[l.stage]?.phase === "visa" || l.temperature === "closed");
    const active = mine.filter((l) => STAGE_CONFIG[l.stage]?.phase !== "visa" && l.temperature !== "closed");
    return {
      name: name.split(" ")[0],
      total: mine.length,
      active: active.length,
      closed: closed.length,
      conversion: mine.length > 0 ? Math.round((closed.length / mine.length) * 100) : 0,
    };
  }).filter((d) => d.total > 0);

  // Conta alunos por curso/escola a partir dos enrollments (com fallback nos campos legados).
  // Agrupa case-insensitive e conta cada lead no máximo 1x por curso/escola.
  const countStudentsBy = (getValues: (l: (typeof leads)[number]) => (string | undefined)[]) => {
    const counts: Record<string, { name: string; value: number }> = {};
    for (const l of leads) {
      const unique = new Set(
        getValues(l)
          .map((v) => v?.trim())
          .filter((v): v is string => !!v)
          .map((v) => v.toLowerCase())
      );
      for (const key of unique) {
        if (!counts[key]) {
          const original = getValues(l).find((v) => v?.trim().toLowerCase() === key)!.trim();
          counts[key] = { name: original, value: 0 };
        }
        counts[key].value += 1;
      }
    }
    return Object.values(counts).sort((a, b) => b.value - a.value);
  };

  const courseData = countStudentsBy((l) =>
    l.enrollments?.length ? l.enrollments.map((e) => e.course) : [l.chosenCourse]
  ).slice(0, 8);

  const schoolData = countStudentsBy((l) =>
    l.enrollments?.length ? l.enrollments.map((e) => e.school) : [l.chosenSchool]
  ).slice(0, 10);

  const hotLeads = leads.filter((l) => l.temperature === "hot").slice(0, 5);

  const now = Date.now();

  const daysSince = (iso?: string) => (iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : null);

  // Growth: leads created in the last 7 / 30 days
  const newThisWeek = leads.filter((l) => l.createdAt && now - new Date(l.createdAt).getTime() < 7 * 86400000).length;
  const newThisMonth = leads.filter((l) => l.createdAt && now - new Date(l.createdAt).getTime() < 30 * 86400000).length;

  // Days the lead has spent in its current stage (from stageHistory)
  const daysInStage = (l: (typeof leads)[number]) => {
    const entry = l.stageHistory?.find((h) => h.stage === l.stage && !h.exitedAt);
    return entry ? Math.floor((now - new Date(entry.enteredAt).getTime()) / 86400000) : null;
  };
  const activeLeadsList = leads.filter((l) => !l.groupId || l.groupRole === "primary");

  // Leads in visa phase = "em processo" — exclude from sales alerts, track separately
  const VISA_PHASE_STAGES = ["visa_lodged", "medical_requested", "visa_granted"];
  const inVisaProcess = activeLeadsList.filter((l) => STAGE_CONFIG[l.stage]?.phase === "visa");

  const visaAlerts = activeLeadsList
    .filter((l) => l.visaExpiryDate && !VISA_PHASE_STAGES.includes(l.stage))
    .map((l) => ({
      ...l,
      daysLeft: Math.ceil((new Date(l.visaExpiryDate!).getTime() - now) / 86400000),
    }))
    .filter((l) => l.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // "Forgotten" = leads with no real activity in 7+ days.
  // Use the MOST RECENT of: lastContactAt, updatedAt, last stageChange, createdAt.
  // Also exclude leads already in advanced phases (enrollment → closed) — they've clearly been worked on.
  const ACTIVE_PHASES = ["leads", "qualifying", "proposal"];
  // "O que fazer hoje" — group active non-closed leads by nextAction
  const todoLeads = activeLeadsList.filter((l) => l.nextAction);
  const todoGroups = Object.entries(
    todoLeads.reduce<Record<string, typeof todoLeads>>((acc, l) => {
      const key = l.nextAction!;
      if (!acc[key]) acc[key] = [];
      acc[key].push(l);
      return acc;
    }, {})
  ).sort((a, b) => b[1].length - a[1].length);

  // Stuck leads — waitingFor set, no activity for 3+ days, NOT in visa process
  const stuckLeads = activeLeadsList
    .map((l) => {
      const candidates = [
        l.updatedAt ? new Date(l.updatedAt).getTime() : 0,
        l.lastContactAt ? new Date(l.lastContactAt).getTime() : 0,
        ...(l.stageChanges ?? []).map((sc) => new Date(sc.changedAt).getTime()),
      ].filter((t) => t > 0);
      const last = candidates.length ? Math.max(...candidates) : 0;
      return { ...l, stuckDays: last ? Math.floor((now - last) / 86400000) : 0 };
    })
    .filter((l) => l.waitingFor && STAGE_CONFIG[l.stage]?.phase !== "visa" && l.stuckDays > 3)
    .sort((a, b) => b.stuckDays - a.stuckDays);

  const forgottenLeads = activeLeadsList.filter((l) => {
    // Leads in enrollment/payments/visa/closed phases are actively being processed — not forgotten
    const phase = STAGE_CONFIG[l.stage]?.phase;
    if (!ACTIVE_PHASES.includes(phase)) return false;

    // Find the most recent activity date across all signals
    const candidates: number[] = [
      l.createdAt ? new Date(l.createdAt).getTime() : 0,
      l.updatedAt ? new Date(l.updatedAt).getTime() : 0,
      l.lastContactAt ? new Date(l.lastContactAt).getTime() : 0,
      ...(l.stageChanges ?? []).map((sc) => new Date(sc.changedAt).getTime()),
      ...(l.notesList ?? []).map((n) => new Date(n.createdAt).getTime()),
      ...(l.contactHistory ?? []).map((c) => new Date(c.date).getTime()),
    ].filter((t) => t > 0);

    const lastActivity = Math.max(...candidates);
    const daysSince = Math.floor((now - lastActivity) / 86400000);
    return daysSince > 7;
  });

  // 🔥 Prioridades de Hoje — reminders vencidos/de hoje + vistos vencendo + travados
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const dueReminders = reminders
    .filter((r) => !r.completed && new Date(r.dueAt).getTime() <= endOfToday.getTime())
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const priorities: { key: string; icon: string; text: string; href: string; sub?: string }[] = [
    ...dueReminders.map((r) => ({
      key: `rem-${r.id}`,
      icon: r.type === "call" ? "📞" : r.type === "whatsapp" ? "💬" : r.type === "email" ? "📧" : r.type === "meeting" ? "📅" : "📌",
      text: `${r.leadName.split(" ")[0]} — ${r.note}`,
      sub: new Date(r.dueAt).getTime() < now ? `atrasado ${Math.max(1, daysSince(r.dueAt) ?? 1)}d` : "hoje",
      href: `/leads/${r.leadId}`,
    })),
    ...visaAlerts.slice(0, 4).map((l) => ({
      key: `visa-${l.id}`,
      icon: "🛂",
      text: `Visto de ${l.fullName.split(" ")[0]} vence em ${l.daysLeft}d`,
      sub: l.currentVisaType || undefined,
      href: `/leads/${l.id}`,
    })),
    ...stuckLeads.slice(0, 4).map((l) => {
      const wfCfg = l.waitingFor ? WAITING_FOR_CONFIG[l.waitingFor] : null;
      return {
        key: `stuck-${l.id}`,
        icon: "⏳",
        text: `Destravar ${l.fullName.split(" ")[0]}`,
        sub: `travado há ${l.stuckDays}d${wfCfg ? ` — esperando ${wfCfg.label.toLowerCase()}` : ""}`,
        href: `/leads/${l.id}`,
      };
    }),
  ].slice(0, 8);

  return (
    <div className="space-y-6">
      {/* 🔥 Prioridades de Hoje */}
      {priorities.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-red-500/25 bg-red-500/5 space-y-3">
          <h3 className="text-sm font-semibold text-red-300">🔥 Prioridades de Hoje</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {priorities.map((p) => (
              <Link key={p.key} href={p.href}>
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.03] border border-border hover:border-red-500/30 hover:bg-red-500/5 transition-colors cursor-pointer">
                  <span className="text-lg flex-shrink-0">{p.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{p.text}</p>
                    {p.sub && <p className="text-xs text-muted-foreground truncate">{p.sub}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {(visaAlerts.length > 0 || forgottenLeads.length > 0) && (
        <div className="space-y-3">
          {visaAlerts.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-amber-500/30 bg-amber-500/5">
              <p className="text-sm font-semibold text-amber-400 mb-2">⚠️ {visaAlerts.length} lead(s) {t("visaExpiringSoon").toLowerCase()}</p>
              <div className="flex flex-wrap gap-2">
                {visaAlerts.map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`}>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors">
                      {l.fullName.split(" ")[0]}{l.currentVisaType ? ` · ${l.currentVisaType}` : ""} ({l.daysLeft < 0 ? `${t("expired")} ${Math.abs(l.daysLeft)}d` : `${l.daysLeft}d`})
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {inVisaProcess.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5">
              <p className="text-sm font-semibold text-emerald-400 mb-2">🛂 {inVisaProcess.length} estudante(s) em processo de visto</p>
              <div className="flex flex-wrap gap-2">
                {inVisaProcess.map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`}>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors">
                      {l.fullName.split(" ")[0]} · {STAGE_CONFIG[l.stage]?.label}{(() => { const d = daysInStage(l); return d !== null && d > 0 ? ` · ${d}d` : ""; })()}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {forgottenLeads.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-blue-500/30 bg-blue-500/5">
              <p className="text-sm font-semibold text-blue-400 mb-2">💤 {forgottenLeads.length} lead(s) {t("forgottenLeads").toLowerCase()}</p>
              <div className="flex flex-wrap gap-2">
                {forgottenLeads.slice(0, 10).map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`}>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition-colors">
                      {l.fullName.split(" ")[0]}
                    </span>
                  </Link>
                ))}
                {forgottenLeads.length > 10 && (
                  <span className="text-xs px-2.5 py-1 text-muted-foreground">+{forgottenLeads.length - 10}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* O que fazer hoje */}
      {todoGroups.length > 0 && (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">⚡ O que fazer hoje</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {todoGroups.map(([action, group]) => {
              const cfg = NEXT_ACTION_CONFIG[action as keyof typeof NEXT_ACTION_CONFIG];
              if (!cfg) return null;
              return (
                <Link key={action} href={`/leads?nextAction=${action}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer">
                    <span className="text-xl">{cfg.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{cfg.label}</p>
                      <p className="text-lg font-bold text-primary">{group.length}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Leads travados (waitingFor > 3 dias sem atividade) */}
      {stuckLeads.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-orange-500/30 bg-orange-500/5">
          <p className="text-sm font-semibold text-orange-400 mb-2">⏳ {stuckLeads.length} lead(s) travado(s) há 3+ dias</p>
          <div className="flex flex-wrap gap-2">
            {stuckLeads.slice(0, 8).map((l) => {
              const wfCfg = l.waitingFor ? WAITING_FOR_CONFIG[l.waitingFor] : null;
              return (
                <Link key={l.id} href={`/leads/${l.id}`}>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 transition-colors">
                    {l.fullName.split(" ")[0]} · travado há {l.stuckDays}d {wfCfg ? `· ${wfCfg.icon} ${wfCfg.label}` : ""}
                  </span>
                </Link>
              );
            })}
            {stuckLeads.length > 8 && <span className="text-xs px-2.5 py-1 text-muted-foreground">+{stuckLeads.length - 8}</span>}
          </div>
        </div>
      )}

      {/* KPI Grid — responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          title={t("totalLeads")}
          value={stats.total}
          icon={Users}
          iconColor="text-blue-400"
          delta={newThisWeek > 0 ? `↑ +${newThisWeek} essa semana` : newThisMonth > 0 ? `+${newThisMonth} esse mês` : undefined}
          deltaPositive
        />
        <StatCard title={t("hotLeads")} value={stats.hot} icon={Flame} iconColor="text-red-400" />
        <StatCard title={t("waitingReply")} value={stats.waitingReply} icon={MessageSquare} iconColor="text-orange-400" />
        <StatCard title={t("meetingsScheduled")} value={stats.meetingsScheduled} icon={Calendar} iconColor="text-violet-400" />
        <StatCard title="In Enrollment" value={stats.applicationsInProgress} icon={FileText} iconColor="text-purple-400" />
        <StatCard title="Payments Pending" value={stats.paymentsPending} icon={CreditCard} iconColor="text-yellow-400" />
        <StatCard title="Visa Pending" value={stats.visaPending} icon={Globe} iconColor="text-cyan-400" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Leads by city */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Alunos por Cidade Atual</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData} barCategoryGap="30%">
              <XAxis dataKey="city" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Course distribution */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Alunos por Curso</h3>
          {courseData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum curso registrado nos alunos ainda.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-[120px]">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={courseData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                      {courseData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {courseData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                    <span className="font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Students by school */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Alunos por Escola</h3>
        {schoolData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma escola registrada nos alunos ainda.</p>
        ) : (
          <div className="space-y-3">
            {(() => {
              const totalSchool = schoolData.reduce((s, d) => s + d.value, 0);
              const max = schoolData[0]?.value ?? 1;
              return schoolData.map((d) => {
                const pct = totalSchool ? Math.round((d.value / totalSchool) * 100) : 0;
                return (
                  <div key={d.name} className="space-y-1">
                    <p className="text-xs text-muted-foreground truncate">{d.name}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${(d.value / max) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-foreground flex-shrink-0 w-16 text-right">{d.value} ({pct}%)</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Consultant performance */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Consultant Performance</h3>
          <div className="space-y-4">
            {consultantData.map((c) => (
              <div key={c.name} className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-blue-300/70">🔵 Total Leads</p>
                    <p className="text-xl font-bold text-blue-300">{c.total}</p>
                  </div>
                  <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-violet-300/70">🟣 Ativos</p>
                    <p className="text-xl font-bold text-violet-300">{c.active}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-300/70">🟢 Fechados</p>
                    <p className="text-xl font-bold text-emerald-300">{c.closed}</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-amber-300/70">🟡 Conversão</p>
                    <p className="text-xl font-bold text-amber-300">{c.conversion}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hot leads */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("hotLeads")}</h3>
          <div className="space-y-2">
            {hotLeads.length === 0 && <p className="text-sm text-muted-foreground">{t("noLeadsFound")}</p>}
            {hotLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {lead.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.enrollments?.find((e) => e.course?.trim())?.course ?? lead.courseInterest}
                        {(() => {
                          const d = daysSince(lead.lastContactAt ?? lead.updatedAt);
                          return d !== null && d > 0 ? ` · sem contato há ${d}d` : "";
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TemperatureBadge temp={lead.temperature} />
                    <StageBadge stage={lead.stage} className="hidden xl:inline-flex" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
