"use client";

import { useCRM } from "@/contexts/CRMContext";
import { PHASE_ORDER, PHASE_CONFIG, STAGE_CONFIG, CITIES, CONSULTANTS } from "@/lib/constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid,
  FunnelChart, Funnel, LabelList,
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { TrendingUp, Clock, DollarSign } from "lucide-react";

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#f43f5e", "#06b6d4", "#84cc16", "#ec4899"];

export default function ReportsPage() {
  const { leads: allLeads } = useCRM();
  // Count only ungrouped leads + group primaries (members don't count as separate opportunities)
  const leads = allLeads.filter((l) => !l.groupId || l.groupRole === "primary");

  const phaseData = PHASE_ORDER.map((phase) => ({
    phase: PHASE_CONFIG[phase].label,
    count: leads.filter((l) => STAGE_CONFIG[l.stage].phase === phase).length,
  }));

  const cityData = CITIES.map((city) => ({
    city,
    count: leads.filter((l) => l.preferredCity === city).length,
  })).sort((a, b) => b.count - a.count);

  const tempData = [
    { name: "Hot 🔥", value: leads.filter((l) => l.temperature === "hot").length, color: "#f43f5e" },
    { name: "Warm ☀️", value: leads.filter((l) => l.temperature === "warm").length, color: "#f59e0b" },
    { name: "Cold ❄️", value: leads.filter((l) => l.temperature === "cold").length, color: "#3b82f6" },
  ];

  const consultantData = CONSULTANTS.map((name) => ({
    name: name.split(" ")[0],
    total: leads.filter((l) => l.assignedConsultant === name).length,
    won: leads.filter((l) => l.assignedConsultant === name && l.stage === "closed_won").length,
    lost: leads.filter((l) => l.assignedConsultant === name && l.stage === "closed_lost").length,
  }));

  const sourceData = ["Facebook Group", "Instagram", "Referral", "Website", "WhatsApp", "Walk-in", "Event", "LinkedIn", "Other"]
    .map((source) => ({ name: source, value: leads.filter((l) => l.source === source).length }))
    .filter((d) => d.value > 0);

  // Simulate monthly trend (last 6 months)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const trendData = months.map((month, i) => ({
    month,
    leads: Math.floor(Math.random() * 20) + 10 + i * 2,
    closedWon: Math.floor(Math.random() * 8) + 2 + i,
  }));

  // Funnel data
  const funnelData = PHASE_ORDER.map((phase, i) => ({
    value: leads.filter((l) => STAGE_CONFIG[l.stage].phase === phase).length,
    name: PHASE_CONFIG[phase].label,
    fill: ["#64748b","#06b6d4","#f97316","#8b5cf6","#f59e0b","#10b981","#6b7280"][i],
  }));

  // Time per stage (avg days from stageHistory)
  const timePerStage = PHASE_ORDER.flatMap((phase) =>
    PHASE_CONFIG[phase].stages.map((stage) => {
      const entries = leads.flatMap((l) =>
        l.stageHistory.filter((h) => h.stage === stage && h.exitedAt)
          .map((h) => (new Date(h.exitedAt!).getTime() - new Date(h.enteredAt).getTime()) / 86400000)
      );
      const avg = entries.length > 0 ? entries.reduce((a, b) => a + b, 0) / entries.length : 0;
      return { stage: STAGE_CONFIG[stage].label.slice(0, 18), days: Math.round(avg * 10) / 10, phase };
    })
  ).filter((d) => d.days > 0).sort((a, b) => b.days - a.days).slice(0, 10);

  // Revenue forecast (next 90 days from pending payments)
  const now = new Date();
  const in30 = new Date(now); in30.setDate(now.getDate() + 30);
  const in60 = new Date(now); in60.setDate(now.getDate() + 60);
  const in90 = new Date(now); in90.setDate(now.getDate() + 90);

  const allPayments = leads.flatMap((l) => l.payments.filter((p) => p.status === "pending" && p.dueDate));
  function sumPayments(from: Date, to: Date) {
    return allPayments
      .filter((p) => { const d = new Date(p.dueDate!); return d >= from && d < to; })
      .reduce((sum, p) => sum + p.amount, 0);
  }
  const forecastData = [
    { period: "0–30 dias", amount: sumPayments(now, in30), fill: "#f59e0b" },
    { period: "31–60 dias", amount: sumPayments(in30, in60), fill: "#3b82f6" },
    { period: "61–90 dias", amount: sumPayments(in60, in90), fill: "#8b5cf6" },
  ];
  const totalForecast = forecastData.reduce((s, d) => s + d.amount, 0);

  const conversionRate = leads.length > 0
    ? Math.round((leads.filter((l) => l.stage === "closed_won").length / leads.length) * 100)
    : 0;

  const TOOLTIP_STYLE = { background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 };

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: leads.length, color: "text-blue-400" },
          { label: "Closed Won", value: leads.filter((l) => l.stage === "closed_won").length, color: "text-emerald-400" },
          { label: "Closed Lost", value: leads.filter((l) => l.stage === "closed_lost").length, color: "text-red-400" },
          { label: "Conversion Rate", value: `${conversionRate}%`, color: "text-primary" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={cn("text-3xl font-bold mt-2", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Leads by Pipeline Phase</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={phaseData} layout="vertical">
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="phase" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Lead Temperature Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={tempData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={4}>
                {tempData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Monthly Lead Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="url(#colorLeads)" name="New Leads" />
              <Area type="monotone" dataKey="closedWon" stroke="#10b981" fill="url(#colorWon)" name="Closed Won" />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Leads by City</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cityData}>
              <XAxis dataKey="city" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Feature 4: Conversion Funnel ── */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Funil de Conversão</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} leads`, ""]} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="#94a3b8" fontSize={11} dataKey="name" />
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {funnelData.map((d, i) => {
              const prev = i > 0 ? funnelData[i - 1].value : d.value;
              const dropRate = prev > 0 ? Math.round(((prev - d.value) / prev) * 100) : 0;
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">{d.name}</span>
                      <span className="text-muted-foreground">{d.value} leads</span>
                    </div>
                    {i > 0 && dropRate > 0 && (
                      <div className="h-1 bg-secondary rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-red-400/60 rounded-full" style={{ width: `${dropRate}%` }} />
                      </div>
                    )}
                  </div>
                  {i > 0 && dropRate > 0 && (
                    <span className="text-xs text-red-400 flex-shrink-0">-{dropRate}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Feature 5 + 6: Time per Stage + Revenue Forecast ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Time per stage */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold">Tempo Médio por Estágio</h3>
            <span className="text-xs text-muted-foreground ml-auto">Top 10 mais lentos</span>
          </div>
          {timePerStage.length === 0 ? (
            <p className="text-sm text-muted-foreground">Dados insuficientes.</p>
          ) : (
            <div className="space-y-2.5">
              {timePerStage.map((item) => {
                const maxDays = timePerStage[0].days;
                return (
                  <div key={item.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{item.stage}</span>
                      <span className={cn("font-medium flex-shrink-0 ml-2", item.days > 7 ? "text-red-400" : item.days > 3 ? "text-amber-400" : "text-emerald-400")}>
                        {item.days}d
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", item.days > 7 ? "bg-red-400" : item.days > 3 ? "bg-amber-400" : "bg-emerald-400")}
                        style={{ width: `${(item.days / maxDays) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue forecast */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold">Revenue Forecast (90 dias)</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Pagamentos pendentes por período</p>
          <div className="text-3xl font-bold text-foreground mb-4">
            {formatCurrency(totalForecast)}
            <span className="text-sm font-normal text-muted-foreground ml-2">projetado</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={forecastData} barCategoryGap="35%">
              <XAxis dataKey="period" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatCurrency(v), "Previsto"]} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {forecastData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {forecastData.map((d) => (
              <div key={d.period} className="text-center p-2 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground">{d.period}</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(d.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Consultant Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={consultantData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="won" fill="#10b981" radius={[4, 4, 0, 0]} name="Won" />
              <Bar dataKey="lost" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Lost" />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Lead Sources</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
