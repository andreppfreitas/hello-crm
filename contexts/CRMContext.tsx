"use client";

import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from "react";
import type { Lead, DashboardStats, Reminder } from "@/types";
import { STAGE_CONFIG } from "@/lib/constants";
import { buildNewLead, uid } from "@/lib/lead-builder";
import { toast } from "sonner";

// ── Stats computed client-side from lead array ────────────────────────────────
// "active" leads = ungrouped leads + group primaries only (members don't count separately)
function activeLeads(leads: Lead[]): Lead[] {
  return leads.filter((l) => !l.groupId || l.groupRole === "primary");
}

function computeStats(leads: Lead[]): DashboardStats {
  const active = activeLeads(leads);
  return {
    total: active.length,
    hot: active.filter((l) => l.temperature === "hot").length,
    waitingReply: active.filter((l) => l.stage === "waiting_response").length,
    meetingsScheduled: active.filter((l) => l.stage === "meeting_scheduled").length,
    applicationsInProgress: active.filter(
      (l) => STAGE_CONFIG[l.stage].order >= 8 && STAGE_CONFIG[l.stage].order <= 12
    ).length,
    paymentsPending: active.filter((l) => l.payments.some((p) => p.status === "pending")).length,
    visaPending: active.filter((l) =>
      ["visa_checklist_call", "statement_reviewed", "final_doc_check", "visa_applied", "final_instructions"].includes(l.stage)
    ).length,
    closedWon: active.filter((l) => l.stage === "closed_won").length,
    closedLost: active.filter((l) => l.stage === "closed_lost").length,
  };
}

// ── Context types ─────────────────────────────────────────────────────────────
interface CRMContextValue {
  leads: Lead[];
  stats: DashboardStats;
  reminders: Reminder[];
  loading: boolean;
  refreshLeads: () => void;
  getLead: (id: string) => Lead | undefined;
  addLead: (data: Omit<Lead, "id" | "createdAt" | "updatedAt" | "tasks" | "contactHistory" | "payments" | "documents" | "notesList" | "stageHistory" | "stageChanges" | "visaChecklist">) => Lead;
  updateLead: (id: string, data: Partial<Lead>) => void;
  removeLead: (id: string) => void;
  addReminder: (data: Omit<Reminder, "id" | "createdAt" | "completed">) => Reminder;
  completeReminder: (id: string) => void;
  removeReminder: (id: string) => void;
}

const CRMContext = createContext<CRMContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function CRMProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<DashboardStats>(computeStats([]));
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/reminders").then((r) => r.json()),
    ])
      .then(([leadsData, remindersData]) => {
        const loadedLeads: Lead[] = leadsData.leads ?? [];
        setLeads(loadedLeads);
        setStats(computeStats(loadedLeads));
        setReminders(remindersData.reminders ?? []);
      })
      .catch(() => toast.error("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, []);

  const refreshLeads = useCallback(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then(({ leads: l }) => {
        setLeads(l ?? []);
        setStats(computeStats(l ?? []));
      });
  }, []);

  const getLead = useCallback(
    (id: string) => leads.find((l) => l.id === id),
    [leads]
  );

  // ── Leads CRUD (optimistic) ────────────────────────────────────────────────
  const addLead = useCallback(
    (data: Parameters<CRMContextValue["addLead"]>[0]): Lead => {
      const lead = buildNewLead(data as Parameters<typeof buildNewLead>[0]);
      // Optimistic update
      setLeads((prev) => {
        const next = [lead, ...prev];
        setStats(computeStats(next));
        return next;
      });
      // Persist
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      }).catch(() => toast.error("Erro ao salvar lead"));
      return lead;
    },
    []
  );

  const updateLead = useCallback((id: string, data: Partial<Lead>) => {
    setLeads((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l
      );
      setStats(computeStats(next));
      return next;
    });
    fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => toast.error("Erro ao atualizar lead"));
  }, []);

  const removeLead = useCallback((id: string) => {
    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== id);
      setStats(computeStats(next));
      return next;
    });
    fetch(`/api/leads/${id}`, { method: "DELETE" }).catch(() =>
      toast.error("Erro ao excluir lead")
    );
  }, []);

  // ── Reminders CRUD (optimistic) ────────────────────────────────────────────
  const addReminder = useCallback(
    (data: Parameters<CRMContextValue["addReminder"]>[0]): Reminder => {
      const reminder: Reminder = {
        ...data,
        id: `rem-${uid()}`,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setReminders((prev) => [reminder, ...prev]);
      fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminder),
      }).catch(() => toast.error("Erro ao salvar lembrete"));
      return reminder;
    },
    []
  );

  const completeReminder = useCallback((id: string) => {
    const completedAt = new Date().toISOString();
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: true, completedAt } : r))
    );
    fetch(`/api/reminders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true, completedAt }),
    }).catch(() => toast.error("Erro ao completar lembrete"));
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    fetch(`/api/reminders/${id}`, { method: "DELETE" }).catch(() =>
      toast.error("Erro ao excluir lembrete")
    );
  }, []);

  return (
    <CRMContext.Provider
      value={{
        leads, stats, reminders, loading, refreshLeads,
        getLead, addLead, updateLead, removeLead,
        addReminder, completeReminder, removeReminder,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error("useCRM must be used within CRMProvider");
  return ctx;
}
