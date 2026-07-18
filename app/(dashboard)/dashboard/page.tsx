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
  PieChart, Pie, Cell, Legend,
} from "recharts";
import Link from "next/link";

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#f43f5e", "#06b6d4", "#84cc16"];

export default function DashboardPage() {
  const { stats, leads } = useCRM();
  const { t } = useLanguage();

  // Build city data from actual lead values (case-insensitive), not just the CITIES constant
  const cityCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const city = l.preferredCity?.trim();
    if (!city) return acc;
    // Normalize to title case match against known cities, otherwise keep as-is
    const known = CITIES.find((c) => c.toLowerCase() === city.toLowerCase());
    const key = known ?? city;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const cityData = Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  const consultantData = CONSULTANTS.map((name) => ({
    name: name.split(" ")[0],
    leads: leads.filter((l) => l.assignedConsultant === name).length,
    visa: leads.filter((l) => l.assignedConsultant === name && STAGE_CONFIG[l.stage]?.phase === "visa").length,
  }));

  const courseData = COURSES.slice(0, 6).map((course) => ({
    name: course.split("–")[0].trim(),
    value: leads.filter((l) => typeof l.courseInterest === "string" && l.courseInterest.includes(course.split("–")[0].trim())).length,
  })).filter((d) => d.value > 0);

  const hotLeads = leads.filter((l) => l.temperature === "hot").slice(0, 5);

  const now = Date.now();
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
  const stuckLeads = activeLeadsList.filter((l) => {
    if (!l.waitingFor) return false;
    if (STAGE_CONFIG[l.stage]?.phase === "visa") return false; // visa = expected waiting
    const candidates = [
      l.updatedAt ? new Date(l.updatedAt).getTime() : 0,
      l.lastContactAt ? new Date(l.lastContactAt).getTime() : 0,
      ...(l.stageChanges ?? []).map((sc) => new Date(sc.changedAt).getTime()),
    ].filter((t) => t > 0);
    const last = Math.max(...candidates);
    return (now - last) / 86400000 > 3;
  });

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

  return (
    <div className="space-y-6">
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
                      {l.fullName.split(" ")[0]} ({l.daysLeft < 0 ? `${t("expired")} ${Math.abs(l.daysLeft)}d` : `${l.daysLeft}d`})
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
                      {l.fullName.split(" ")[0]} · {STAGE_CONFIG[l.stage]?.label}
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
                    {l.fullName.split(" ")[0]} {wfCfg ? `· ${wfCfg.icon} ${wfCfg.label}` : ""}
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
        <StatCard title={t("totalLeads")} value={stats.total} icon={Users} iconColor="text-blue-400" />
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
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads by Preferred City</h3>
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
          <h3 className="text-sm font-semibold text-foreground mb-4">Course Interest</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={courseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                {courseData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Consultant performance */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Consultant Performance</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={consultantData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8 }} />
              <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="visa" fill="#10b981" radius={[4, 4, 0, 0]} name="Em Visto" />
            </BarChart>
          </ResponsiveContainer>
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
                      <p className="text-xs text-muted-foreground truncate">{lead.courseInterest}</p>
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
