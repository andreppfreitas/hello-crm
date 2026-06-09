"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Activity, UserPlus, Trash2, ArrowRight, Thermometer,
  MessageSquare, User, RefreshCw,
} from "lucide-react";
import type { ActivityEntry } from "@/types";

const ACTION_CONFIG: Record<
  ActivityEntry["action"],
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  lead_created:       { label: "Lead criada",          icon: UserPlus,      color: "text-emerald-400", bg: "bg-emerald-500/15" },
  lead_deleted:       { label: "Lead deletada",         icon: Trash2,        color: "text-red-400",     bg: "bg-red-500/15" },
  stage_changed:      { label: "Estágio alterado",      icon: ArrowRight,    color: "text-blue-400",    bg: "bg-blue-500/15" },
  note_added:         { label: "Nota adicionada",       icon: MessageSquare, color: "text-violet-400",  bg: "bg-violet-500/15" },
  temperature_changed:{ label: "Temperatura alterada",  icon: Thermometer,   color: "text-orange-400",  bg: "bg-orange-500/15" },
  consultant_changed: { label: "Consultor alterado",    icon: User,          color: "text-cyan-400",    bg: "bg-cyan-500/15" },
  lead_updated:       { label: "Lead atualizada",       icon: RefreshCw,     color: "text-slate-400",   bg: "bg-slate-500/15" },
};

export default function ActivityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityEntry["action"] | "all">("all");

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    fetch("/api/activity?limit=200")
      .then((r) => r.ok ? r.json() : { log: [] })
      .then((d) => { setLog(d.log ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (user?.role !== "admin") return null;

  const filtered = filter === "all" ? log : log.filter((e) => e.action === filter);

  // Group by day
  const grouped: Record<string, ActivityEntry[]> = {};
  filtered.forEach((entry) => {
    const day = new Date(entry.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(entry);
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Log de Atividades
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{log.length} eventos registrados</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetch("/api/activity?limit=200").then(r => r.json()).then(d => { setLog(d.log ?? []); setLoading(false); }); }}
          className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors", filter === "all" ? "bg-primary/15 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
        >
          Todos ({log.length})
        </button>
        {(Object.entries(ACTION_CONFIG) as [ActivityEntry["action"], typeof ACTION_CONFIG[keyof typeof ACTION_CONFIG]][]).map(([action, cfg]) => {
          const count = log.filter((e) => e.action === action).length;
          if (count === 0) return null;
          return (
            <button
              key={action}
              onClick={() => setFilter(action)}
              className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors", filter === action ? `${cfg.bg} border-current ${cfg.color}` : "border-border text-muted-foreground hover:text-foreground")}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">Carregando...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center space-y-2">
          <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda</p>
          <p className="text-xs text-muted-foreground/60">As ações do sistema aparecerão aqui conforme forem realizadas</p>
        </div>
      )}

      {!loading && Object.entries(grouped).map(([day, entries]) => (
        <div key={day} className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{day}</p>
          <div className="glass-card rounded-xl overflow-hidden divide-y divide-border/30">
            {entries.map((entry) => {
              const cfg = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.lead_updated;
              const Icon = cfg.icon;
              return (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                    <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{entry.userName}</span>
                      <span className="text-xs text-muted-foreground">{cfg.label.toLowerCase()}</span>
                      {entry.leadId && (
                        <Link href={`/leads/${entry.leadId}`} className="text-xs text-primary hover:underline font-medium truncate max-w-[140px]">
                          {entry.leadName}
                        </Link>
                      )}
                    </div>
                    {entry.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.details}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                    {new Date(entry.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
