"use client";

import { useCRM } from "@/contexts/CRMContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { StageBadge } from "@/components/shared/StageBadge";
import { formatDate, initials } from "@/lib/utils";
import { computeScore, scoreColor, scoreBarColor } from "@/lib/scoring";
import { CONSULTANTS, CITIES, STAGE_CONFIG, PHASE_ORDER, PHASE_CONFIG, NEXT_ACTION_CONFIG, NEXT_ACTION_OPTIONS } from "@/lib/constants";
import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, SlidersHorizontal, Eye, Trash2, X, ChevronDown,
  CheckSquare, Users, ChevronRight, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import type { Lead, LeadTemperature, PipelineStage, NextAction } from "@/types";
import { cn } from "@/lib/utils";

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsInner />
    </Suspense>
  );
}

// ── Inline editable cell components ────────────────────────────────────────

function EditableTemp({ lead, onSave }: { lead: Lead; onSave: (v: LeadTemperature) => void }) {
  const [open, setOpen] = useState(false);
  const opts: LeadTemperature[] = ["hot", "warm", "cold"];
  const icons = { hot: "🔥", warm: "☀️", cold: "❄️" };
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}>
        <TemperatureBadge temp={lead.temperature} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-50 top-8 left-0 bg-card border border-border rounded-xl shadow-xl p-1 min-w-[110px]"
          >
            {opts.map((t) => (
              <button
                key={t}
                onClick={() => { onSave(t); setOpen(false); }}
                className={cn("w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 capitalize", lead.temperature === t && "bg-white/5")}
              >
                {icons[t]} {t}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditableStage({ lead, onSave }: { lead: Lead; onSave: (v: PipelineStage) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}>
        <StageBadge stage={lead.stage} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-50 top-8 left-0 bg-card border border-border rounded-xl shadow-xl p-1 w-64 max-h-80 overflow-y-auto scrollbar-thin"
          >
            {PHASE_ORDER.map((phase) => (
              <div key={phase}>
                <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {PHASE_CONFIG[phase].label}
                </p>
                {PHASE_CONFIG[phase].stages.map((s) => (
                  <button
                    key={s}
                    onClick={() => { onSave(s); setOpen(false); }}
                    className={cn("w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs hover:bg-white/5", lead.stage === s && "bg-white/5")}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STAGE_CONFIG[s].dot)} />
                    <span className={STAGE_CONFIG[s].color}>{STAGE_CONFIG[s].label}</span>
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditableName({ lead, onSave }: { lead: Lead; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(lead.fullName);
  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { onSave(val); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { onSave(val); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
        className="bg-secondary border border-primary/50 rounded-lg px-2 py-1 text-sm text-foreground w-36 focus:outline-none"
      />
    );
  }
  return (
    <span
      className="text-sm font-medium text-foreground cursor-text hover:text-primary transition-colors border-b border-transparent hover:border-primary/40"
      onClick={() => setEditing(true)}
    >
      {lead.fullName}
    </span>
  );
}

// ── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5 min-w-[64px]">
      <span className={cn("text-xs font-bold tabular-nums w-6", scoreColor(score))}>{score}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", scoreBarColor(score))} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ── Bulk action bar ─────────────────────────────────────────────────────────

function BulkBar({
  count,
  onStageChange,
  onConsultantChange,
  onDelete,
  onClear,
}: {
  count: number;
  onStageChange: (s: PipelineStage) => void;
  onConsultantChange: (c: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [showStage, setShowStage] = useState(false);
  const [showConsultant, setShowConsultant] = useState(false);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-3 bg-card border border-border rounded-2xl px-3 md:px-5 py-3 shadow-2xl max-w-[calc(100vw-2rem)]"
    >
      <span className="text-sm font-medium text-foreground mr-1 md:mr-2 whitespace-nowrap">
        <CheckSquare className="w-4 h-4 inline mr-1.5 text-primary" />
        {count}
      </span>

      {/* Change Stage */}
      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => { setShowStage((v) => !v); setShowConsultant(false); }} className="gap-1.5 text-xs">
          <ArrowRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mudar estágio</span>
        </Button>
        <AnimatePresence>
          {showStage && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-10 left-0 bg-card border border-border rounded-xl shadow-xl p-1 w-60 max-h-72 overflow-y-auto scrollbar-thin z-50"
            >
              {PHASE_ORDER.map((phase) => (
                <div key={phase}>
                  <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{PHASE_CONFIG[phase].label}</p>
                  {PHASE_CONFIG[phase].stages.map((s) => (
                    <button key={s} onClick={() => { onStageChange(s); setShowStage(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs hover:bg-white/5">
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STAGE_CONFIG[s].dot)} />
                      <span className={STAGE_CONFIG[s].color}>{STAGE_CONFIG[s].label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Assign consultant */}
      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => { setShowConsultant((v) => !v); setShowStage(false); }} className="gap-1.5 text-xs">
          <Users className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Atribuir</span>
        </Button>
        <AnimatePresence>
          {showConsultant && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-10 left-0 bg-card border border-border rounded-xl shadow-xl p-1 w-48 z-50"
            >
              {CONSULTANTS.map((c) => (
                <button key={c} onClick={() => { onConsultantChange(c); setShowConsultant(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 text-left">
                  {c}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

function LeadsInner() {
  const { leads, updateLead, removeLead } = useCRM();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(!!(searchParams.get("consultant") || searchParams.get("nextAction")));
  const [filterTemp, setFilterTemp] = useState<LeadTemperature | "">("");
  const [filterStage, setFilterStage] = useState<PipelineStage | "">("");
  const [filterConsultant, setFilterConsultant] = useState(searchParams.get("consultant") ?? "");
  const [filterCity, setFilterCity] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterNextAction, setFilterNextAction] = useState<NextAction | "">((searchParams.get("nextAction") ?? "") as NextAction | "");
  const [sortField, setSortField] = useState<"createdAt" | "fullName" | "temperature" | "score" | "visaExpiryDate">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const scored = useMemo(() => leads.map((l) => ({ ...l, score: computeScore(l) })), [leads]);

  const deduped = useMemo(() => {
    return scored.filter((l) => {
      if (!l.groupId) return true;
      if (l.groupRole === "primary") return true;
      return false;
    });
  }, [scored]);

  const filtered = useMemo(() => {
    let list = [...deduped];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) => l.fullName.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.phone.includes(q));
    }
    if (filterTemp) list = list.filter((l) => l.temperature === filterTemp);
    if (filterStage) list = list.filter((l) => l.stage === filterStage);
    if (filterConsultant) list = list.filter((l) => l.assignedConsultant === filterConsultant);
    if (filterCity) list = list.filter((l) => l.preferredCity === filterCity);
    if (filterCourse) list = list.filter((l) => l.courseInterest?.includes(filterCourse));
    if (filterNextAction) list = list.filter((l) => l.nextAction === filterNextAction);
    list.sort((a, b) => {
      if (sortField === "score") return sortDir === "asc" ? (a.score ?? 0) - (b.score ?? 0) : (b.score ?? 0) - (a.score ?? 0);
      if (sortField === "visaExpiryDate") {
        // Leads without a visa expiry date always sort to the bottom, regardless of direction
        const at = a.visaExpiryDate ? new Date(a.visaExpiryDate).getTime() : Infinity;
        const bt = b.visaExpiryDate ? new Date(b.visaExpiryDate).getTime() : Infinity;
        if (at === Infinity && bt === Infinity) return 0;
        if (at === Infinity) return 1;
        if (bt === Infinity) return -1;
        return sortDir === "asc" ? at - bt : bt - at;
      }
      const av = String(a[sortField as keyof typeof a]);
      const bv = String(b[sortField as keyof typeof b]);
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [scored, search, filterTemp, filterStage, filterConsultant, filterCity, filterCourse, sortField, sortDir]);

  const activeFilters = [filterTemp, filterStage, filterConsultant, filterCity, filterCourse, filterNextAction].filter(Boolean).length;
  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function bulkStageChange(stage: PipelineStage) {
    selected.forEach((id) => updateLead(id, { stage }));
    toast.success(`${selected.size} leads movidos para ${STAGE_CONFIG[stage].label}`);
    setSelected(new Set());
  }

  function bulkConsultantChange(consultant: string) {
    selected.forEach((id) => updateLead(id, { assignedConsultant: consultant }));
    toast.success(`${selected.size} leads atribuídos para ${consultant}`);
    setSelected(new Set());
  }

  function bulkDelete() {
    if (!confirm(`Deletar ${selected.size} leads?`)) return;
    selected.forEach((id) => removeLead(id));
    toast.success(`${selected.size} leads deletados`);
    setSelected(new Set());
  }

  function handleDelete(lead: Lead) {
    if (confirm(`Deletar ${lead.fullName}?`)) {
      removeLead(lead.id);
      toast.success(`${lead.fullName} deletado`);
    }
  }

  function SortTh({ field, label, defaultDir = "desc" }: { field: typeof sortField; label: string; defaultDir?: "asc" | "desc" }) {
    const active = sortField === field;
    return (
      <th
        className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
        onClick={() => { active ? setSortDir((d) => d === "asc" ? "desc" : "asc") : (setSortField(field), setSortDir(defaultDir)); }}
      >
        <span className="flex items-center gap-1">
          {label}
          {active && <ChevronDown className={cn("w-3 h-3 transition-transform", sortDir === "asc" && "rotate-180")} />}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary/50" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} className={cn("gap-2 min-h-[44px]", activeFilters > 0 && "border-primary text-primary")}>
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">{t("filter")}</span>
          {activeFilters > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>}
        </Button>
        <Link href="/import" className="inline-flex items-center gap-1.5 h-11 px-3 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
          {t("import")}
        </Link>
        <p className="text-sm text-muted-foreground ml-auto">{leads.length} leads</p>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass-card rounded-xl p-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              <select value={filterTemp} onChange={(e) => setFilterTemp(e.target.value as LeadTemperature | "")} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                <option value="">{t("temperature")}</option>
                <option value="hot">🔥 {t("hot")}</option>
                <option value="warm">☀️ {t("warm")}</option>
                <option value="cold">❄️ {t("cold")}</option>
              </select>
              <select value={filterStage} onChange={(e) => setFilterStage(e.target.value as PipelineStage | "")} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                <option value="">Todos os estágios</option>
                {PHASE_ORDER.map((phase) => (
                  <optgroup key={phase} label={PHASE_CONFIG[phase].label}>
                    {PHASE_CONFIG[phase].stages.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
                  </optgroup>
                ))}
              </select>
              <select value={filterConsultant} onChange={(e) => setFilterConsultant(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                <option value="">{t("consultant")}</option>
                {CONSULTANTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                <option value="">{t("city")}</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                <option value="">{t("course")}</option>
                {["ELICOS", "VET", "Bachelor", "Master", "Foundation", "Professional Year"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-2">
                <select value={filterNextAction ?? ""} onChange={(e) => setFilterNextAction((e.target.value || "") as NextAction | "")} className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                  <option value="">Next Action</option>
                  {NEXT_ACTION_OPTIONS.map((a) => (
                    <option key={a} value={a}>{NEXT_ACTION_CONFIG[a].icon} {NEXT_ACTION_CONFIG[a].label}</option>
                  ))}
                </select>
                {activeFilters > 0 && (
                  <Button variant="ghost" size="icon" onClick={() => { setFilterTemp(""); setFilterStage(""); setFilterConsultant(""); setFilterCity(""); setFilterCourse(""); setFilterNextAction(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile card view (< md) */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">{t("noLeadsFound")}</div>
        )}
        {filtered.map((lead) => {
          const groupMembers = lead.groupId
            ? leads.filter((l) => l.groupId === lead.groupId && l.id !== lead.id)
            : [];
          return (
            <div key={lead.id} className={cn("glass-card rounded-xl p-4 space-y-3", selected.has(lead.id) && "ring-1 ring-primary/40")}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} className="w-4 h-4 rounded accent-primary cursor-pointer flex-shrink-0" />
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {initials(lead.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/leads/${lead.id}`}>
                    <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">{lead.fullName}</p>
                  </Link>
                  {groupMembers.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.groupType === "couple" ? "👫" : "👨‍👩‍👧"} {groupMembers.map((m) => m.fullName.split(" ")[0]).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <TemperatureBadge temp={lead.temperature} />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span className="truncate max-w-[140px]">{lead.courseInterest || "—"}</span>
                <span>·</span>
                <StageBadge stage={lead.stage} />
              </div>

              {lead.visaExpiryDate && (() => {
                const days = Math.ceil((new Date(lead.visaExpiryDate).getTime() - Date.now()) / 86400000);
                return (
                  <p className={cn("text-xs font-medium", days < 0 ? "text-red-400" : days <= 30 ? "text-amber-400" : "text-muted-foreground")}>
                    {t("visaExpiry")}: {lead.visaExpiryDate.split("-").reverse().join("/")}
                    {days < 0 ? ` (${t("expired")})` : ` (${days}d)`}
                  </p>
                );
              })()}

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
                <div className="flex items-center gap-1">
                  <Link href={`/leads/${lead.id}`}>
                    <Button variant="ghost" size="icon" className="w-8 h-8"><Eye className="w-3.5 h-3.5" /></Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDelete(lead)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table view (md+) */}
      <div className="hidden md:block glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                </th>
                <SortTh field="fullName" label={t("name")} />
                <SortTh field="visaExpiryDate" label={t("visaExpiry")} defaultDir="asc" />
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("phone")}</th>
                <SortTh field="temperature" label="Temp" />
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("stage")}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Action</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("course")}</th>
                <SortTh field="createdAt" label={t("created")} />
                <th className="px-3 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground text-sm">{t("noLeadsFound")}</td></tr>
              )}
              {filtered.map((lead) => {
                const groupMembers = lead.groupId
                  ? leads.filter((l) => l.groupId === lead.groupId && l.id !== lead.id)
                  : [];
                const groupLabel = lead.groupType === "couple" ? "👫" : "👨‍👩‍👧";
                return (
                <tr key={lead.id} className={cn("hover:bg-white/3 transition-colors group", selected.has(lead.id) && "bg-primary/5")}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} className="w-4 h-4 rounded accent-primary cursor-pointer" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {initials(lead.fullName)}
                      </div>
                      <div>
                        <EditableName lead={lead} onSave={(v) => updateLead(lead.id, { fullName: v })} />
                        {groupMembers.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs">{groupLabel}</span>
                            <span className="text-xs text-muted-foreground">
                              {groupMembers.map((m) => m.fullName.split(" ")[0]).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {(STAGE_CONFIG[lead.stage]?.phase === "visa" || lead.isOffshore) ? (
                      <div className="flex flex-col gap-1">
                        {STAGE_CONFIG[lead.stage]?.phase === "visa" && (
                          <span className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit",
                            lead.stage === "visa_granted"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          )}>
                            {lead.stage === "visa_granted" ? "✅ Aprovado" : "🛂 Aplicado"}
                          </span>
                        )}
                        {lead.isOffshore && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit bg-violet-500/15 text-violet-400 border-violet-500/30">
                            ✈️ Offshore
                          </span>
                        )}
                      </div>
                    ) : lead.visaExpiryDate ? (() => {
                      const days = Math.ceil((new Date(lead.visaExpiryDate).getTime() - Date.now()) / 86400000);
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className={cn(
                            "text-xs font-medium",
                            days < 0 ? "text-red-400" : days <= 30 ? "text-amber-400" : "text-emerald-400"
                          )}>
                            {lead.visaExpiryDate.split("-").reverse().join("/")}
                          </span>
                          <span className={cn(
                            "text-[10px]",
                            days < 0 ? "text-red-400/70" : days <= 30 ? "text-amber-400/70" : "text-muted-foreground"
                          )}>
                            {days < 0 ? `${t("expired")} ${Math.abs(days)}d` : days === 0 ? "Hoje!" : `${days}d`}
                          </span>
                        </div>
                      );
                    })() : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <div>{lead.phone}</div>
                  </td>
                  <td className="px-3 py-3">
                    <EditableTemp lead={lead} onSave={(v) => { updateLead(lead.id, { temperature: v }); toast.success("Temperatura atualizada"); }} />
                  </td>
                  <td className="px-3 py-3">
                    <EditableStage lead={lead} onSave={(v) => { updateLead(lead.id, { stage: v }); toast.success(`${t("stage")}: ${STAGE_CONFIG[v].label}`); }} />
                    {lead.completedStages && lead.completedStages.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {lead.completedStages.filter((s) => s !== lead.stage).map((s) => (
                          <span key={s} className={cn("text-[9px] px-1 py-0.5 rounded font-medium", STAGE_CONFIG[s]?.color, "bg-white/5")}>
                            ✓ {STAGE_CONFIG[s]?.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {lead.nextAction ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary whitespace-nowrap">
                        {NEXT_ACTION_CONFIG[lead.nextAction].icon} {NEXT_ACTION_CONFIG[lead.nextAction].label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{lead.courseInterest}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(lead.createdAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="ghost" size="icon" className="w-7 h-7"><Eye className="w-3.5 h-3.5" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(lead)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            onStageChange={bulkStageChange}
            onConsultantChange={bulkConsultantChange}
            onDelete={bulkDelete}
            onClear={() => setSelected(new Set())}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
