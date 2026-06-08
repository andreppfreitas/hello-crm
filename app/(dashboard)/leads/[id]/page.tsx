"use client";

import { use, useState } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { StageBadge } from "@/components/shared/StageBadge";
import { formatDate, formatCurrency, initials, isOverdue } from "@/lib/utils";
import { computeScore, scoreColor, scoreBarColor } from "@/lib/scoring";
import type { VisaChecklistItem } from "@/types";
import { STAGE_CONFIG, PHASE_ORDER, PHASE_CONFIG, CONSULTANTS, CITIES, COURSES, TASK_TEMPLATES } from "@/lib/constants";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Phone, Mail, MapPin, Globe, BookOpen, DollarSign,
  User, Calendar, MessageSquare, FileText, CreditCard, CheckSquare,
  Plus, Check, Clock, Trash2, ChevronRight, Bell, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PipelineStage, LeadTemperature, Task, Note } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { TemplateDrawer } from "@/components/shared/TemplateDrawer";
import { ReminderModal } from "@/components/shared/ReminderModal";
import { GroupModal } from "@/components/shared/GroupModal";
import { Link2 } from "lucide-react";

const TABS = ["Overview", "Tasks", "Notes", "Timeline", "Payments", "Visa", "Documents"] as const;
type Tab = typeof TABS[number];

export default function LeadProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getLead, updateLead, removeLead } = useCRM();
  const router = useRouter();
  const lead = getLead(id);

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<Note["type"]>("note");
  const [editStage, setEditStage] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showGroup, setShowGroup] = useState(false);

  if (!lead) return notFound();

  function handleStageChange(stage: PipelineStage) {
    if (!lead) return;
    const newTasks = TASK_TEMPLATES[stage].map((title, i) => ({
      id: `${lead.id}-${stage}-task-${i}`,
      title,
      completed: false,
      stage,
    }));
    updateLead(lead.id, {
      stage,
      tasks: [...lead.tasks.filter((t) => t.stage !== stage), ...newTasks],
    });
    setEditStage(false);
    toast.success(`Stage updated to ${STAGE_CONFIG[stage].label}`);
  }

  function handleTemperatureChange(temperature: LeadTemperature) {
    if (!lead) return;
    updateLead(lead.id, { temperature });
    toast.success("Temperature updated");
  }

  function handleTaskToggle(taskId: string) {
    if (!lead) return;
    updateLead(lead.id, {
      tasks: lead.tasks.map((t) =>
        t.id === taskId
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
          : t
      ),
    });
  }

  function handleAddNote() {
    if (!newNote.trim() || !lead) return;
    const note: Note = {
      id: `note-${Date.now()}`,
      content: newNote.trim(),
      authorName: CONSULTANTS[0],
      createdAt: new Date().toISOString(),
      type: noteType,
    };
    updateLead(lead.id, { notesList: [note, ...lead.notesList] });
    setNewNote("");
    toast.success("Note added");
  }

  function handleDelete() {
    if (!lead) return;
    if (confirm(`Delete ${lead.fullName} from CRM?`)) {
      removeLead(lead.id);
      toast.success(`${lead.fullName} removed`);
      router.push("/leads");
    }
  }

  const stageTasks = lead.tasks.filter((t) => t.stage === lead.stage);
  const completedCount = stageTasks.filter((t) => t.completed).length;
  const progress = stageTasks.length > 0 ? Math.round((completedCount / stageTasks.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leads"><Button variant="ghost" size="icon"><ChevronLeft className="w-4 h-4" /></Button></Link>
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-bold">
            {initials(lead.fullName)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{lead.fullName}</h2>
            <p className="text-sm text-muted-foreground">{lead.courseInterest} · {lead.preferredCity}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TemperatureBadge temp={lead.temperature} />
          <StageBadge stage={lead.stage} />
          <WhatsAppButton lead={lead} />
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowReminder(true)} className="gap-2">
            <Bell className="w-3.5 h-3.5 text-primary" />
            Lembrete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGroup(true)}
            className={cn("gap-2", lead.groupId && "border-primary/50 text-primary bg-primary/10")}
          >
            <Link2 className="w-3.5 h-3.5" />
            {lead.groupId ? (lead.groupType === "couple" ? "👫 Casal" : "👨‍👩‍👧 Família") : "Vincular"}
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <TemplateDrawer lead={lead} open={showTemplates} onClose={() => setShowTemplates(false)} />
      <ReminderModal leadId={lead.id} leadName={lead.fullName} open={showReminder} onClose={() => setShowReminder(false)} />
      <GroupModal lead={lead} open={showGroup} onOpenChange={setShowGroup} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: details panel */}
        <div className="space-y-4">
          {/* Contact info */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</h3>
            <InfoRow icon={Phone} label={lead.phone} />
            <InfoRow icon={Mail} label={lead.email} />
            <InfoRow icon={MapPin} label={lead.currentLocation} />
            <InfoRow icon={Globe} label={lead.country} />
          </div>

          {/* Course & budget */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course Details</h3>
            <InfoRow icon={BookOpen} label={lead.courseInterest || "Not specified"} />
            <InfoRow icon={MapPin} label={`Preferred: ${lead.preferredCity || "Any"}`} />
            <InfoRow icon={DollarSign} label={lead.budget || "Not specified"} />
          </div>

          {/* CRM info */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CRM</h3>
            <InfoRow icon={User} label={lead.assignedConsultant} />
            <InfoRow icon={MessageSquare} label={`Source: ${lead.source}`} />
            <InfoRow icon={Calendar} label={`Added ${formatDate(lead.createdAt, "relative")}`} />
          </div>

          {/* Lead score */}
          <div className="glass-card rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead Score</h3>
            {(() => { const s = computeScore(lead); return (
              <>
                <div className="flex items-end gap-2">
                  <span className={cn("text-3xl font-bold", scoreColor(s))}>{s}</span>
                  <span className="text-sm text-muted-foreground mb-1">/100</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", scoreBarColor(s))} style={{ width: `${s}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {s >= 75 ? "Lead com alta probabilidade de conversão" : s >= 50 ? "Lead em progresso, acompanhe de perto" : s >= 25 ? "Lead frio, precisa de engajamento" : "Lead em risco, ação urgente necessária"}
                </p>
              </>
            ); })()}
          </div>

          {/* Temperature control */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Temperature</h3>
            <div className="flex gap-2">
              {(["hot", "warm", "cold"] as LeadTemperature[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTemperatureChange(t)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    lead.temperature === t
                      ? t === "hot" ? "bg-red-500/20 border-red-500/50 text-red-300"
                        : t === "warm" ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                        : "bg-blue-500/20 border-blue-500/50 text-blue-300"
                      : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "hot" ? "🔥" : t === "warm" ? "☀️" : "❄️"} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Stage selector */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Stage</h3>
              <button onClick={() => setEditStage((v) => !v)} className="text-xs text-primary hover:underline">
                {editStage ? "Cancel" : "Change"}
              </button>
            </div>
            <StageBadge stage={lead.stage} />
            {/* Stage progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tasks</span>
                <span>{completedCount}/{stageTasks.length}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <AnimatePresence>
              {editStage && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-2 pt-2">
                    {PHASE_ORDER.map((phase) => (
                      <div key={phase}>
                        <p className="text-xs text-muted-foreground mb-1">{PHASE_CONFIG[phase].label}</p>
                        <div className="space-y-1">
                          {PHASE_CONFIG[phase].stages.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStageChange(s)}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between",
                                s === lead.stage ? "bg-primary/15 text-primary" : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {STAGE_CONFIG[s].label}
                              {s === lead.stage && <Check className="w-3 h-3" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: tabs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab bar */}
          <div className="glass-card rounded-xl p-1 flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2 text-xs font-medium rounded-lg transition-colors",
                  activeTab === tab ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="glass-card rounded-xl p-5">
            {activeTab === "Overview" && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Lead Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Full Name", lead.fullName],
                    ["Email", lead.email],
                    ["Phone", lead.phone],
                    ["Country", lead.country],
                    ["Location", lead.currentLocation],
                    ["Course", lead.courseInterest],
                    ["City", lead.preferredCity],
                    ["Budget", lead.budget],
                    ["Source", lead.source],
                    ["Consultant", lead.assignedConsultant],
                    ["Added", formatDate(lead.createdAt)],
                    ["Last Contact", lead.lastContactAt ? formatDate(lead.lastContactAt, "relative") : "Never"],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm text-foreground">{value || "—"}</p>
                    </div>
                  ))}
                </div>
                {lead.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Initial Notes</p>
                    <p className="text-sm text-foreground bg-secondary/30 rounded-lg p-3">{lead.notes}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Tasks" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Tasks for {STAGE_CONFIG[lead.stage].label}</h3>
                  <span className="text-xs text-muted-foreground">{completedCount}/{stageTasks.length} done</span>
                </div>
                {stageTasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks for this stage.</p>}
                {stageTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn("flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer", task.completed ? "border-emerald-500/20 bg-emerald-500/5" : "border-border hover:bg-white/3")}
                    onClick={() => handleTaskToggle(task.id)}
                  >
                    <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors", task.completed ? "bg-emerald-500 border-emerald-500" : "border-border")}>
                      {task.completed && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>{task.title}</p>
                      {task.dueDate && (
                        <p className={cn("text-xs mt-0.5 flex items-center gap-1", isOverdue(task.dueDate) && !task.completed ? "text-red-400" : "text-muted-foreground")}>
                          <Clock className="w-3 h-3" />
                          {task.dueDate}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "Notes" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {(["note", "call", "email", "whatsapp", "meeting"] as Note["type"][]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setNoteType(t)}
                        className={cn("px-2.5 py-1 rounded-lg text-xs border transition-colors capitalize", noteType === t ? "bg-primary/15 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder={`Add a ${noteType}...`}
                      rows={3}
                      className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleAddNote(); }}
                    />
                    <Button onClick={handleAddNote} size="icon" className="self-end bg-primary text-primary-foreground"><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {lead.notesList.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                  {lead.notesList.map((note) => (
                    <div key={note.id} className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="capitalize font-medium text-foreground">{note.type}</span>
                        <span>{note.authorName} · {formatDate(note.createdAt, "relative")}</span>
                      </div>
                      <p className="text-sm text-foreground">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "Timeline" && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Histórico Completo</h3>
                {/* Stage changes */}
                {(lead.stageChanges ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mudanças de Estágio</p>
                    {(lead.stageChanges ?? []).map((sc) => (
                      <div key={sc.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ChevronRight className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 pb-2 border-b border-border/50">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-xs font-medium", STAGE_CONFIG[sc.fromStage]?.color)}>{STAGE_CONFIG[sc.fromStage]?.label}</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <span className={cn("text-xs font-medium", STAGE_CONFIG[sc.toStage]?.color)}>{STAGE_CONFIG[sc.toStage]?.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{sc.changedBy} · {formatDate(sc.changedAt, "relative")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Contact history */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contatos</p>
                  {lead.contactHistory.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato registrado.</p>}
                  {lead.contactHistory.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 pb-2 border-b border-border/50">
                        <p className="text-sm text-foreground">{event.summary}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.authorName} · {formatDate(event.date, "relative")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "Payments" && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Payment Tracking</h3>
                {lead.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
                {lead.payments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{pay.label}</p>
                      {pay.dueDate && <p className="text-xs text-muted-foreground">Due {pay.dueDate}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(pay.amount, pay.currency)}</p>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        pay.status === "collected" ? "bg-emerald-500/20 text-emerald-300" :
                        pay.status === "overdue" ? "bg-red-500/20 text-red-300" :
                        "bg-yellow-500/20 text-yellow-300"
                      )}>
                        {pay.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "Visa" && (
              <VisaChecklistTab lead={lead} onUpdate={(checklist) => updateLead(lead.id, { visaChecklist: checklist })} />
            )}

            {activeTab === "Documents" && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Documents</h3>
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1.5" /> Upload Document</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const VISA_CATEGORY_LABELS: Record<VisaChecklistItem["category"], string> = {
  identity: "🪪 Identidade",
  enrollment: "🎓 Matrícula",
  financial: "💰 Financeiro",
  health: "🏥 Saúde / Segurança",
  other: "📋 Outros",
};

const STATUS_STYLES: Record<VisaChecklistItem["status"], { label: string; className: string }> = {
  pending:   { label: "Pendente",  className: "bg-secondary/50 text-muted-foreground border-border" },
  received:  { label: "Recebido",  className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  submitted: { label: "Enviado",   className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

function VisaChecklistTab({ lead, onUpdate }: { lead: Lead; onUpdate: (items: VisaChecklistItem[]) => void }) {
  const checklist = lead.visaChecklist ?? [];
  const submitted = checklist.filter((i) => i.status === "submitted").length;
  const received = checklist.filter((i) => i.status === "received").length;

  function cycleStatus(id: string) {
    const order: VisaChecklistItem["status"][] = ["pending", "received", "submitted"];
    onUpdate(checklist.map((item) =>
      item.id === id ? { ...item, status: order[(order.indexOf(item.status) + 1) % 3] } : item
    ));
  }

  const categories = Array.from(new Set(checklist.map((i) => i.category)));

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-semibold text-sm">Student Visa 500 — Checklist</h3>
          <span className="text-muted-foreground">{submitted}/{checklist.length} enviados</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${checklist.length > 0 ? (submitted / checklist.length) * 100 : 0}%` }} />
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="text-emerald-400 font-medium">{submitted} enviados ao DIBP</span>
          <span className="text-amber-400 font-medium">{received} recebidos</span>
          <span>{checklist.length - submitted - received} pendentes</span>
        </div>
      </div>

      {/* Items grouped by category */}
      {categories.map((cat) => (
        <div key={cat} className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{VISA_CATEGORY_LABELS[cat]}</p>
          {checklist.filter((i) => i.category === cat).map((item) => {
            const style = STATUS_STYLES[item.status];
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border hover:bg-white/3 transition-colors cursor-pointer"
                onClick={() => cycleStatus(item.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border",
                    item.status === "submitted" ? "bg-emerald-500 border-emerald-500" :
                    item.status === "received"  ? "bg-amber-500 border-amber-500" :
                    "border-border"
                  )}>
                    {item.status !== "pending" && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={cn("text-sm", item.status === "submitted" && "line-through text-muted-foreground")}>
                    {item.label}
                  </span>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0", style.className)}>
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Clique em qualquer item para alternar: Pendente → Recebido → Enviado ao DIBP</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-foreground truncate">{label}</span>
    </div>
  );
}
