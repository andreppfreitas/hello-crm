"use client";

import { useCRM } from "@/contexts/CRMContext";
import { StatCard } from "@/components/shared/StatCard";
import { StageBadge } from "@/components/shared/StageBadge";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { formatDate } from "@/lib/utils";
import { CITIES, COURSES, CONSULTANTS } from "@/lib/constants";
import {
  Users, Flame, MessageSquare, Calendar, FileText,
  CreditCard, Globe, Trophy, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import Link from "next/link";

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#f43f5e", "#06b6d4", "#84cc16"];

export default function DashboardPage() {
  const { stats, leads } = useCRM();

  const cityData = CITIES.map((city) => ({
    city,
    count: leads.filter((l) => l.preferredCity === city).length,
  })).sort((a, b) => b.count - a.count);

  const consultantData = CONSULTANTS.map((name) => ({
    name: name.split(" ")[0],
    leads: leads.filter((l) => l.assignedConsultant === name).length,
    closed: leads.filter((l) => l.assignedConsultant === name && l.stage === "closed_won").length,
  }));

  const courseData = COURSES.slice(0, 6).map((course) => ({
    name: course.split("–")[0].trim(),
    value: leads.filter((l) => typeof l.courseInterest === "string" && l.courseInterest.includes(course.split("–")[0].trim())).length,
  })).filter((d) => d.value > 0);

  const hotLeads = leads.filter((l) => l.temperature === "hot").slice(0, 5);

  const now = Date.now();
  const activeLeadsList = leads.filter((l) => l.stage !== "closed_won" && l.stage !== "closed_lost" && (!l.groupId || l.groupRole === "primary"));

  const visaAlerts = activeLeadsList
    .filter((l) => l.visaExpiryDate)
    .map((l) => ({
      ...l,
      daysLeft: Math.ceil((new Date(l.visaExpiryDate!).getTime() - now) / 86400000),
    }))
    .filter((l) => l.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const forgottenLeads = activeLeadsList.filter((l) => {
    const lastContact = l.lastContactAt ?? l.createdAt;
    const daysSince = Math.floor((now - new Date(lastContact).getTime()) / 86400000);
    return daysSince > 7;
  });

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(visaAlerts.length > 0 || forgottenLeads.length > 0) && (
        <div className="space-y-3">
          {visaAlerts.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-amber-500/30 bg-amber-500/5">
              <p className="text-sm font-semibold text-amber-400 mb-2">⚠️ {visaAlerts.length} lead(s) com visto vencendo em breve</p>
              <div className="flex flex-wrap gap-2">
                {visaAlerts.map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`}>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors">
                      {l.fullName.split(" ")[0]} ({l.daysLeft < 0 ? `vencido há ${Math.abs(l.daysLeft)}d` : `${l.daysLeft}d`})
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {forgottenLeads.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-blue-500/30 bg-blue-500/5">
              <p className="text-sm font-semibold text-blue-400 mb-2">💤 {forgottenLeads.length} lead(s) sem contato há +7 dias</p>
              <div className="flex flex-wrap gap-2">
                {forgottenLeads.slice(0, 10).map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`}>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition-colors">
                      {l.fullName.split(" ")[0]}
                    </span>
                  </Link>
                ))}
                {forgottenLeads.length > 10 && (
                  <span className="text-xs px-2.5 py-1 text-muted-foreground">+{forgottenLeads.length - 10} mais</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
        <StatCard title="Total Leads" value={stats.total} icon={Users} iconColor="text-blue-400" />
        <StatCard title="Hot Leads" value={stats.hot} icon={Flame} iconColor="text-red-400" />
        <StatCard title="Waiting Reply" value={stats.waitingReply} icon={MessageSquare} iconColor="text-orange-400" />
        <StatCard title="Meetings" value={stats.meetingsScheduled} icon={Calendar} iconColor="text-violet-400" />
        <StatCard title="In Enrollment" value={stats.applicationsInProgress} icon={FileText} iconColor="text-purple-400" />
        <StatCard title="Payments Pending" value={stats.paymentsPending} icon={CreditCard} iconColor="text-yellow-400" />
        <StatCard title="Visa Pending" value={stats.visaPending} icon={Globe} iconColor="text-cyan-400" />
        <StatCard title="Closed Won" value={stats.closedWon} icon={Trophy} iconColor="text-emerald-400" />
        <StatCard title="Closed Lost" value={stats.closedLost} icon={XCircle} iconColor="text-red-400" />
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
              <Bar dataKey="closed" fill="#10b981" radius={[4, 4, 0, 0]} name="Closed Won" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hot leads */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Hot Leads</h3>
          <div className="space-y-2">
            {hotLeads.length === 0 && <p className="text-sm text-muted-foreground">No hot leads right now.</p>}
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
