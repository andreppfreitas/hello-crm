"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCRM } from "@/contexts/CRMContext";
import { StageBadge } from "@/components/shared/StageBadge";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { cn, initials } from "@/lib/utils";
import Link from "next/link";
import {
  Users, Kanban, TrendingUp, ChevronRight,
  Trophy, Flame, Clock, Building2, Crown,
} from "lucide-react";

interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "consultant";
  office?: string;
  createdAt: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const { leads } = useCRM();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.ok ? r.json() : { users: [] })
      .then((d) => { setUsers(d.users ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // If not admin, redirect
  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  if (user?.role !== "admin") return null;

  // Stats per user
  function getStats(name: string) {
    const userLeads = leads.filter(
      (l) => l.assignedConsultant === name && (!l.groupId || l.groupRole === "primary")
    );
    const active = userLeads.filter((l) => !["closed_won", "closed_lost"].includes(l.stage));
    const hot = userLeads.filter((l) => l.temperature === "hot");
    const closedWon = userLeads.filter((l) => l.stage === "closed_won");
    const recentLeads = [...active]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 3);
    return { total: userLeads.length, active: active.length, hot: hot.length, closedWon: closedWon.length, recentLeads };
  }

  const consultants = users.filter((u) => u.role === "consultant");
  const admins = users.filter((u) => u.role === "admin");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Equipe</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/settings?tab=usuarios"
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-border bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          Gerenciar usuários
        </Link>
      </div>

      {loading && (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">Carregando...</div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: user list */}
          <div className="space-y-3 lg:col-span-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Consultores ({consultants.length})</p>
            {consultants.map((u) => {
              const stats = getStats(u.displayName);
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(isSelected ? null : u)}
                  className={cn(
                    "w-full glass-card rounded-xl p-4 text-left transition-all border",
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-white/3"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                      {initials(u.displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.displayName}</p>
                      {u.office && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />{u.office}
                        </p>
                      )}
                    </div>
                    <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isSelected && "rotate-90")} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      { label: "Leads", value: stats.active, icon: Users, color: "text-blue-400" },
                      { label: "Hot", value: stats.hot, icon: Flame, color: "text-red-400" },
                      { label: "Fechados", value: stats.closedWon, icon: Trophy, color: "text-emerald-400" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="bg-secondary/30 rounded-lg p-2 text-center">
                        <Icon className={cn("w-3.5 h-3.5 mx-auto mb-0.5", color)} />
                        <p className="text-base font-bold text-foreground">{value}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}

            {admins.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">Admins ({admins.length})</p>
                {admins.map((u) => {
                  const stats = getStats(u.displayName);
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(isSelected ? null : u)}
                      className={cn(
                        "w-full glass-card rounded-xl p-4 text-left transition-all border",
                        isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:border-border/80 hover:bg-white/3"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold flex-shrink-0">
                          {initials(u.displayName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-foreground truncate">{u.displayName}</p>
                            <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          </div>
                          {u.office && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />{u.office}
                            </p>
                          )}
                        </div>
                        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isSelected && "rotate-90")} />
                      </div>
                      {stats.total > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {[
                            { label: "Leads", value: stats.active, icon: Users, color: "text-blue-400" },
                            { label: "Hot", value: stats.hot, icon: Flame, color: "text-red-400" },
                            { label: "Fechados", value: stats.closedWon, icon: Trophy, color: "text-emerald-400" },
                          ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="bg-secondary/30 rounded-lg p-2 text-center">
                              <Icon className={cn("w-3.5 h-3.5 mx-auto mb-0.5", color)} />
                              <p className="text-base font-bold text-foreground">{value}</p>
                              <p className="text-[10px] text-muted-foreground">{label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Right: selected user detail */}
          <div className="lg:col-span-2">
            {!selectedUser ? (
              <div className="glass-card rounded-xl p-12 text-center h-full flex flex-col items-center justify-center gap-3">
                <Users className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Selecione um membro da equipe para ver detalhes</p>
              </div>
            ) : (
              <ConsultantDetail user={selectedUser} leads={leads} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConsultantDetail({
  user,
  leads,
}: {
  user: UserRecord;
  leads: ReturnType<typeof useCRM>["leads"];
}) {
  const userLeads = leads.filter(
    (l) => l.assignedConsultant === user.displayName && (!l.groupId || l.groupRole === "primary")
  );
  const active = userLeads.filter((l) => !["closed_won", "closed_lost"].includes(l.stage));
  const recent = [...userLeads].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 10);

  const byStage: Record<string, number> = {};
  active.forEach((l) => { byStage[l.stage] = (byStage[l.stage] ?? 0) + 1; });

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
            {initials(user.displayName)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              {user.displayName}
              {user.role === "admin" && <Crown className="w-4 h-4 text-amber-400" />}
            </h3>
            <p className="text-sm text-muted-foreground capitalize">
              {user.role === "admin" ? "Admin" : "Consultor"}{user.office ? ` · ${user.office}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{user.username}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Link
            href={`/leads?consultant=${encodeURIComponent(user.displayName)}`}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Ver Leads
          </Link>
          <Link
            href={`/pipeline?consultant=${encodeURIComponent(user.displayName)}`}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/70 text-foreground transition-colors"
          >
            <Kanban className="w-3.5 h-3.5" />
            Ver Pipeline
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total de Leads", value: userLeads.length, icon: Users, color: "text-blue-400" },
          { label: "Ativos", value: active.length, icon: TrendingUp, color: "text-cyan-400" },
          { label: "Hot", value: userLeads.filter((l) => l.temperature === "hot").length, icon: Flame, color: "text-red-400" },
          { label: "Fechados", value: userLeads.filter((l) => l.stage === "closed_won").length, icon: Trophy, color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card rounded-xl p-3 text-center">
            <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent leads */}
      {recent.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
            <h4 className="text-sm font-semibold text-foreground">Leads Recentes</h4>
            <Link
              href={`/leads?consultant=${encodeURIComponent(user.displayName)}`}
              className="text-xs text-primary hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-border/30">
            {recent.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {initials(lead.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.courseInterest ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TemperatureBadge temp={lead.temperature} />
                    <StageBadge stage={lead.stage} className="hidden sm:inline-flex" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {userLeads.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma lead atribuída ainda</p>
        </div>
      )}
    </div>
  );
}
