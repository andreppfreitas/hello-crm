"use client";

import { use, useState } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { StageBadge } from "@/components/shared/StageBadge";
import { formatDate, formatCurrency, initials, isOverdue } from "@/lib/utils";
import { computeScore, scoreColor, scoreBarColor } from "@/lib/scoring";
import type { VisaChecklistItem, NextAction, WaitingFor } from "@/types";
import { STAGE_CONFIG, PHASE_ORDER, PHASE_CONFIG, CONSULTANTS, CITIES, COURSES, TASK_TEMPLATES, STAGE_BEHAVIOR_CONFIG, NEXT_ACTION_CONFIG, NEXT_ACTION_OPTIONS, WAITING_FOR_CONFIG, WAITING_FOR_OPTIONS } from "@/lib/constants";
import { getAutoTasks, getAutoTaskDef } from "@/lib/auto-tasks";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Phone, Mail, MapPin, Globe, BookOpen,
  User, Calendar, MessageSquare, FileText, CreditCard, CheckSquare,
  Plus, Check, Clock, Trash2, ChevronRight, Bell, Sparkles, Flag, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Lead, PipelineStage, LeadTemperature, Task, Note } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { WhatsAppTemplateModal } from "@/components/shared/WhatsAppTemplateModal";
import { TemplateDrawer } from "@/components/shared/TemplateDrawer";
import { ReminderModal } from "@/components/shared/ReminderModal";
import { GroupModal } from "@/components/shared/GroupModal";
import { Link2 } from "lucide-react";

const TABS = ["Overview", "Tasks", "Notes", "Timeline", "Payments", "Visa", "Documents"] as const;
type Tab = typeof TABS[number];

const VISA_PRESETS = [
  "Student Visa 500",
  "Visitor Visa 600",
  "Working Holiday 417",
  "Work and Holiday 462",
  "Graduate Visa 485",
  "Partner Visa",
  "Bridging Visa",
];

export default function LeadProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getLead, updateLead, removeLead, addReminder } = useCRM();
  const router = useRouter();
  const lead = getLead(id);

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<Note["type"]>("note");
  const [editStage, setEditStage] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [visaOtherMode, setVisaOtherMode] = useState(
    !!(lead?.currentVisaType && !VISA_PRESETS.includes(lead.currentVisaType))
  );

  if (!lead) return notFound();

  function handleStageChange(stage: PipelineStage) {
    if (!lead) return;
    // Block if current stage has an incomplete checklist
    if (lead.stageChecklist && lead.stageChecklist.length > 0) {
      const incomplete = lead.stageChecklist.filter((c) => !c.done);
      if (incomplete.length > 0) {
        toast.error(`Complete o checklist antes de avançar (${incomplete.length} item${incomplete.length > 1 ? "s" : ""} pendente${incomplete.length > 1 ? "s" : ""})`);
        return;
      }
    }
    const newTasks = TASK_TEMPLATES[stage].map((title, i) => ({
      id: `${lead.id}-${stage}-task-${i}`,
      title,
      completed: false,
      stage,
    }));
    const behavior = STAGE_BEHAVIOR_CONFIG[stage];
    const stageChecklist = behavior.checklist.map((label, i) => ({
      id: `chk-${stage}-${i}`,
      label,
      done: false,
    }));
    updateLead(lead.id, {
      stage,
      tasks: [...lead.tasks.filter((t) => t.stage !== stage), ...newTasks],
      nextAction: behavior.defaultNextAction,
      waitingFor: behavior.defaultWaitingFor,
      stageChecklist,
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
    const now = new Date().toISOString();
    const note: Note = {
      id: `note-${Date.now()}`,
      content: newNote.trim(),
      authorName: CONSULTANTS[0],
      createdAt: now,
      type: noteType,
    };
    updateLead(lead.id, { notesList: [note, ...lead.notesList] });
    // Auto-create reminder from note
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 1);
    addReminder({
      leadId: lead.id,
      leadName: lead.fullName,
      type: noteType === "call" ? "call" : noteType === "email" ? "email" : noteType === "whatsapp" ? "whatsapp" : "other",
      note: note.content,
      dueAt: dueAt.toISOString(),
      authorName: CONSULTANTS[0],
    });
    setNewNote("");
    toast.success("Note adicionada + lembrete criado para amanhã");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/leads"><Button variant="ghost" size="icon" className="flex-shrink-0"><ChevronLeft className="w-4 h-4" /></Button></Link>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-base sm:text-lg font-bold flex-shrink-0">
            {initials(lead.fullName)}
          </div>
          <div className="min-w-0">
            <input
              defaultValue={lead.fullName}
              onBlur={(e) => { if (e.target.value.trim() && e.target.value !== lead.fullName) updateLead(lead.id, { fullName: e.target.value.trim() }); }}
              className="text-lg sm:text-xl font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary/50 outline-none transition-colors w-full"
            />
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{lead.courseInterest} · {lead.preferredCity}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <TemperatureBadge temp={lead.temperature} />
          <StageBadge stage={lead.stage} />
          <WhatsAppButton lead={lead} />
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="gap-1.5 h-8">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Templates</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowReminder(true)} className="gap-1.5 h-8">
            <Bell className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Lembrete</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGroup(true)}
            className={cn("gap-1.5 h-8", lead.groupId && "border-primary/50 text-primary bg-primary/10")}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lead.groupId ? (lead.groupType === "couple" ? "👫 Casal" : "👨‍👩‍👧 Família") : "Vincular"}</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={handleDelete}>
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
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <EditableField icon={Phone} value={lead.phone} placeholder="Telefone" onSave={(v) => updateLead(lead.id, { phone: v })} type="tel" />
              </div>
              {lead.phone && (
                <button
                  onClick={() => setShowWaModal(true)}
                  title="Enviar WhatsApp"
                  className="flex-shrink-0 p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              )}
              <WhatsAppTemplateModal lead={lead} isOpen={showWaModal} onClose={() => setShowWaModal(false)} />
            </div>
            <EditableField icon={Mail} value={lead.email} placeholder="Email" onSave={(v) => updateLead(lead.id, { email: v })} type="email" />
            <EditableField icon={MapPin} value={lead.currentCity} placeholder="Cidade atual" onSave={(v) => updateLead(lead.id, { currentCity: v || undefined })} />
            <EditableField icon={Globe} value={lead.currentCountry} placeholder="País atual" onSave={(v) => updateLead(lead.id, { currentCountry: v || undefined })} />
            <EditableField icon={Flag} value={lead.country} placeholder="País do passaporte" onSave={(v) => updateLead(lead.id, { country: v })} />
          </div>

          {/* Visa / offshore */}
          <div className={cn("glass-card rounded-xl p-4 space-y-3", STAGE_CONFIG[lead.stage]?.phase === "visa" && "border border-emerald-500/30 bg-emerald-500/5")}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visto & Status</h3>
              {STAGE_CONFIG[lead.stage]?.phase === "visa" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  🛂 Em Processo de Visto
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                lead.isOffshore
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "bg-secondary text-muted-foreground border border-border"
              )}>
                {lead.isOffshore ? "✈️ Offshore" : "🏠 Onshore"}
              </span>
              <button
                onClick={() => updateLead(lead.id, { isOffshore: !lead.isOffshore })}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
              >
                {lead.isOffshore ? "marcar onshore" : "marcar offshore"}
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tipo de visto atual</label>
              <select
                value={visaOtherMode ? "Outro" : (lead.currentVisaType ?? "")}
                onChange={(e) => {
                  if (e.target.value === "Outro") {
                    setVisaOtherMode(true);
                    updateLead(lead.id, { currentVisaType: undefined });
                  } else {
                    setVisaOtherMode(false);
                    updateLead(lead.id, { currentVisaType: e.target.value || undefined });
                  }
                }}
                className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="">— Selecionar —</option>
                {VISA_PRESETS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
                <option value="Outro">Outro…</option>
              </select>
              {visaOtherMode && (
                <input
                  defaultValue={lead.currentVisaType ?? ""}
                  onBlur={(e) => updateLead(lead.id, { currentVisaType: e.target.value || undefined })}
                  placeholder="Descrever tipo de visto"
                  className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                />
              )}
            </div>
            {STAGE_CONFIG[lead.stage]?.phase === "visa" ? (
              <div className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold",
                lead.stage === "visa_granted"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              )}>
                {lead.stage === "visa_granted" ? "✅ Visto aprovado!" : lead.stage === "medical_requested" ? "🏥 Exame médico solicitado" : "🛂 Visto lodged — aguardando decisão"}
              </div>
            ) : (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Vencimento do visto atual</label>
              <input
                type="date"
                defaultValue={lead.visaExpiryDate ?? ""}
                onBlur={(e) => updateLead(lead.id, { visaExpiryDate: e.target.value || undefined })}
                className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
              />
              {lead.visaExpiryDate && (() => {
                const daysLeft = Math.ceil((new Date(lead.visaExpiryDate).getTime() - Date.now()) / 86400000);
                return (
                  <p className={cn("text-xs font-medium", daysLeft < 0 ? "text-destructive" : daysLeft < 30 ? "text-amber-400" : "text-emerald-400")}>
                    {daysLeft < 0 ? `⚠️ Vencido há ${Math.abs(daysLeft)} dias` : daysLeft < 30 ? `⚠️ Vence em ${daysLeft} dias` : `✓ Vence em ${daysLeft} dias`}
                  </p>
                );
              })()}
            </div>
            )}
          </div>

          {/* Cursos & Escolas */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cursos & Escolas</h3>
              <button
                onClick={() => {
                  const next = [...(lead.enrollments ?? []), { id: `enr-${Date.now()}`, course: "", school: "", campus: "" }];
                  updateLead(lead.id, { enrollments: next });
                }}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            {(!lead.enrollments || lead.enrollments.length === 0) ? (
              <p className="text-xs text-muted-foreground italic text-center py-2">Nenhuma opção registrada.</p>
            ) : (
              <div className="space-y-3">
                {lead.enrollments.map((enr, idx) => (
                  <div key={enr.id} className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Opção {idx + 1}</span>
                      <button
                        onClick={() => updateLead(lead.id, { enrollments: lead.enrollments!.filter((e) => e.id !== enr.id) })}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      key={enr.id + "-course"}
                      defaultValue={enr.course}
                      placeholder="Curso"
                      onBlur={(e) => {
                        const v = e.target.value;
                        updateLead(lead.id, { enrollments: lead.enrollments!.map((e) => e.id === enr.id ? { ...e, course: v } : e) });
                      }}
                      className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                    />
                    <input
                      key={enr.id + "-school"}
                      defaultValue={enr.school}
                      placeholder="Escola"
                      onBlur={(e) => {
                        const v = e.target.value;
                        updateLead(lead.id, { enrollments: lead.enrollments!.map((e) => e.id === enr.id ? { ...e, school: v } : e) });
                      }}
                      className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                    />
                    <input
                      key={enr.id + "-campus"}
                      defaultValue={enr.campus ?? ""}
                      placeholder="Campus / Cidade (opcional)"
                      onBlur={(e) => {
                        const v = e.target.value;
                        updateLead(lead.id, { enrollments: lead.enrollments!.map((e) => e.id === enr.id ? { ...e, campus: v || undefined } : e) });
                      }}
                      className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CRM info */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CRM</h3>
            <EditableSelect icon={User} value={lead.assignedConsultant} options={CONSULTANTS} onSave={(v) => updateLead(lead.id, { assignedConsultant: v })} />
            <EditableSelect icon={MessageSquare} value={lead.source} options={["Facebook Group","Instagram","Referral","Website","WhatsApp","Walk-in","Event","LinkedIn","Other"]} onSave={(v) => updateLead(lead.id, { source: v })} />
            <InfoRow icon={Calendar} label={`Adicionado ${formatDate(lead.createdAt, "relative")}`} />
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
            {/* Completed stages within current phase */}
            {(() => {
              const currentPhase = STAGE_CONFIG[lead.stage]?.phase;
              const phaseStages = currentPhase ? PHASE_CONFIG[currentPhase]?.stages ?? [] : [];
              if (phaseStages.length <= 1) return null;
              const completed = new Set([lead.stage, ...(lead.completedStages ?? [])]);
              return (
                <div className="space-y-1 pt-1 border-t border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider pt-1">Concluídos nesta fase</p>
                  {phaseStages.map((s) => {
                    const isDone = completed.has(s);
                    const isCurrent = s === lead.stage;
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          if (isCurrent) return; // can't uncheck current
                          const prev = lead.completedStages ?? [];
                          const next = isDone
                            ? prev.filter((x) => x !== s)
                            : [...prev, s];
                          updateLead(lead.id, { completedStages: next });
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left",
                          isCurrent ? "bg-primary/15 text-primary cursor-default" :
                          isDone ? "bg-emerald-500/10 text-emerald-300" :
                          "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                          isCurrent ? "bg-primary border-primary" :
                          isDone ? "bg-emerald-500 border-emerald-500" : "border-border"
                        )}>
                          {(isDone || isCurrent) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        {STAGE_CONFIG[s].label}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

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
          <div className="glass-card rounded-xl p-1 flex gap-1 overflow-x-auto scrollbar-thin">
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
                    ["Nome completo", lead.fullName],
                    ["Email", lead.email],
                    ["Telefone", lead.phone],
                    ["Passaporte", lead.country],
                    ["Cidade atual", lead.currentCity ?? lead.currentLocation],
                    ["País atual", lead.currentCountry],
                    ["Visto atual", lead.currentVisaType],
                    ["Venc. visto", lead.visaExpiryDate ? formatDate(lead.visaExpiryDate) : undefined],
                    ["Source", lead.source],
                    ["Consultor", lead.assignedConsultant],
                    ["Adicionado", formatDate(lead.createdAt)],
                    ["Último contato", lead.lastContactAt ? formatDate(lead.lastContactAt, "relative") : "Nunca"],
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

                {/* Next Action + Waiting For */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  {/* Next Action */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Action</p>
                    <select
                      value={lead.nextAction ?? ""}
                      onChange={(e) => updateLead(lead.id, { nextAction: (e.target.value || null) as NextAction })}
                      className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary/50"
                    >
                      <option value="">— None —</option>
                      {NEXT_ACTION_OPTIONS.map((a) => (
                        <option key={a} value={a}>
                          {NEXT_ACTION_CONFIG[a].icon} {NEXT_ACTION_CONFIG[a].label}
                        </option>
                      ))}
                    </select>
                    {lead.nextAction && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                        <span className="text-base">{NEXT_ACTION_CONFIG[lead.nextAction].icon}</span>
                        <span className="text-sm font-medium text-primary">{NEXT_ACTION_CONFIG[lead.nextAction].label}</span>
                      </div>
                    )}
                  </div>

                  {/* Waiting For */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waiting For</p>
                    <select
                      value={lead.waitingFor ?? ""}
                      onChange={(e) => updateLead(lead.id, { waitingFor: (e.target.value || null) as WaitingFor })}
                      className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary/50"
                    >
                      <option value="">— None —</option>
                      {WAITING_FOR_OPTIONS.map((w) => (
                        <option key={w} value={w}>
                          {WAITING_FOR_CONFIG[w].icon} {WAITING_FOR_CONFIG[w].label}
                        </option>
                      ))}
                    </select>
                    {lead.waitingFor && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <span className="text-base">{WAITING_FOR_CONFIG[lead.waitingFor].icon}</span>
                        <span className="text-sm font-medium text-amber-300">{WAITING_FOR_CONFIG[lead.waitingFor].label}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stage Checklist */}
                {lead.stageChecklist && lead.stageChecklist.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Stage Checklist — {STAGE_CONFIG[lead.stage].label}
                    </p>
                    <div className="space-y-1.5">
                      {lead.stageChecklist.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            updateLead(lead.id, {
                              stageChecklist: lead.stageChecklist!.map((c) =>
                                c.id === item.id ? { ...c, done: !c.done } : c
                              ),
                            });
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors",
                            item.done
                              ? "border-emerald-500/20 bg-emerald-500/5"
                              : "border-border hover:bg-white/3"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                            item.done ? "bg-emerald-500 border-emerald-500" : "border-border"
                          )}>
                            {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={cn("text-sm", item.done && "line-through text-muted-foreground")}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {lead.stageChecklist.filter((c) => c.done).length}/{lead.stageChecklist.length} concluídos
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Tasks" && (
              <div className="space-y-3">
                {/* Auto tasks — virtual, derived from missing lead data */}
                {getAutoTasks(lead).map((autoTask) => {
                  const def = getAutoTaskDef(autoTask.id);
                  return (
                    <div key={autoTask.id} className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/8">
                      <div className="w-5 h-5 rounded border border-amber-500/50 flex items-center justify-center flex-shrink-0 mt-0.5 bg-amber-500/15">
                        <span className="text-[9px] text-amber-400">!</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-amber-300">{autoTask.title}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Auto</span>
                        </div>
                        {def && <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>}
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Tasks · {STAGE_CONFIG[lead.stage]?.label ?? lead.stage}</h3>
                  <span className="text-xs text-muted-foreground">{completedCount}/{stageTasks.length} done</span>
                </div>
                {stageTasks.length === 0 && getAutoTasks(lead).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma task para este estágio.</p>
                )}
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
              <TimelineTab lead={lead} />
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

// ── Unified Timeline ───────────────────────────────────────────────────────────

type TimelineEvent = {
  id: string;
  date: string;
  type: "created" | "stage" | "note" | "call" | "email" | "whatsapp" | "meeting" | "task" | "payment";
  title: string;
  subtitle?: string;
  author?: string;
};

const TYPE_STYLES: Record<TimelineEvent["type"], { icon: React.ElementType; color: string; bg: string }> = {
  created:   { icon: Sparkles,     color: "text-primary",      bg: "bg-primary/15" },
  stage:     { icon: ChevronRight, color: "text-blue-400",     bg: "bg-blue-500/15" },
  note:      { icon: FileText,     color: "text-violet-400",   bg: "bg-violet-500/15" },
  call:      { icon: Phone,        color: "text-emerald-400",  bg: "bg-emerald-500/15" },
  email:     { icon: Mail,         color: "text-cyan-400",     bg: "bg-cyan-500/15" },
  whatsapp:  { icon: MessageSquare,color: "text-emerald-400",  bg: "bg-emerald-500/15" },
  meeting:   { icon: Calendar,     color: "text-amber-400",    bg: "bg-amber-500/15" },
  task:      { icon: CheckSquare,  color: "text-teal-400",     bg: "bg-teal-500/15" },
  payment:   { icon: CreditCard,   color: "text-yellow-400",   bg: "bg-yellow-500/15" },
};

function TimelineTab({ lead }: { lead: Lead }) {
  const events: TimelineEvent[] = [];

  // Lead creation
  events.push({
    id: "created",
    date: lead.createdAt,
    type: "created",
    title: "Lead criada no CRM",
    subtitle: `Atribuída a ${lead.assignedConsultant} · origem: ${lead.source}`,
  });

  // Stage changes
  (lead.stageChanges ?? []).forEach((sc) => {
    events.push({
      id: sc.id,
      date: sc.changedAt,
      type: "stage",
      title: `${STAGE_CONFIG[sc.fromStage]?.label} → ${STAGE_CONFIG[sc.toStage]?.label}`,
      author: sc.changedBy,
    });
  });

  // Notes (notesList)
  lead.notesList.forEach((note) => {
    events.push({
      id: note.id,
      date: note.createdAt,
      type: note.type as TimelineEvent["type"],
      title: note.content,
      author: note.authorName,
    });
  });

  // Contact history (deduplicate with notesList by checking proximity)
  lead.contactHistory.forEach((ev) => {
    events.push({
      id: ev.id,
      date: ev.date,
      type: ev.type as TimelineEvent["type"],
      title: ev.summary,
      author: ev.authorName,
    });
  });

  // Completed tasks
  lead.tasks.filter((t) => t.completed && t.completedAt).forEach((t) => {
    events.push({
      id: `task-${t.id}`,
      date: t.completedAt!,
      type: "task",
      title: `✓ ${t.title}`,
    });
  });

  // Collected payments
  lead.payments.filter((p) => p.paidAt).forEach((p) => {
    events.push({
      id: `pay-${p.id}`,
      date: p.paidAt!,
      type: "payment",
      title: `Pagamento recebido: ${p.label}`,
      subtitle: `${p.currency} ${p.amount.toLocaleString("pt-BR")}`,
    });
  });

  // Sort newest first
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Linha do Tempo</h3>
        <span className="text-xs text-muted-foreground">{events.length} evento{events.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border/50" />
        <div className="space-y-4">
          {events.map((ev) => {
            const style = TYPE_STYLES[ev.type] ?? TYPE_STYLES.note;
            const Icon = style.icon;
            return (
              <div key={ev.id} className="flex gap-3 relative">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ring-2 ring-background", style.bg)}>
                  <Icon className={cn("w-3.5 h-3.5", style.color)} />
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <p className="text-sm text-foreground leading-snug">{ev.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {ev.subtitle && <span className="text-xs text-muted-foreground">{ev.subtitle}</span>}
                    {ev.author && <span className="text-xs text-muted-foreground">{ev.author} ·</span>}
                    <span className="text-xs text-muted-foreground">{formatDate(ev.date, "relative")}</span>
                  </div>
                </div>
              </div>
            );
          })}
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
  other: "📋 Formulários de Visto",
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

function EditableField({
  icon: Icon, value, placeholder, onSave, type = "text",
}: {
  icon: React.ElementType; value?: string; placeholder: string; onSave: (v: string) => void; type?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <input
        type={type}
        defaultValue={value ?? ""}
        onBlur={(e) => { if (e.target.value !== (value ?? "")) onSave(e.target.value); }}
        placeholder={placeholder}
        className="flex-1 text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors py-0.5 min-w-0"
      />
    </div>
  );
}

function EditableSelect({
  icon: Icon, value, options, onSave,
}: {
  icon: React.ElementType; value?: string; options: string[]; onSave: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <select
        value={value ?? ""}
        onChange={(e) => onSave(e.target.value)}
        className="flex-1 text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary/50 text-foreground outline-none transition-colors py-0.5 cursor-pointer"
      >
        {options.map((o) => <option key={o} value={o} className="bg-background">{o}</option>)}
      </select>
    </div>
  );
}
