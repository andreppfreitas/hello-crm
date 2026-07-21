"use client";

import { useCRM } from "@/contexts/CRMContext";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { PHASE_ORDER, PHASE_CONFIG, STAGE_CONFIG, NEXT_ACTION_CONFIG, WAITING_FOR_CONFIG, ALL_STAGES } from "@/lib/constants";
import { initials, formatDate } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Lead, PipelineStage } from "@/types";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, CheckSquare, Clock, Phone, ChevronRight } from "lucide-react";
import { WhatsAppTemplateModal } from "@/components/shared/WhatsAppTemplateModal";

// ── Droppable stage row ─────────────────────────────────────────────────────

function DroppableStageRow({
  stage,
  activeOverId,
  draggedStage,
}: {
  stage: PipelineStage;
  activeOverId: string | null;
  draggedStage?: PipelineStage;
}) {
  const id = `stage::${stage}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  const cfg = STAGE_CONFIG[stage];
  const isCurrent = draggedStage === stage;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all",
        isOver
          ? "bg-white/20 ring-1 ring-white/40 scale-[1.02]"
          : isCurrent
          ? "bg-white/8 opacity-60"
          : "hover:bg-white/5"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      <span className={cn(
        "text-xs transition-colors flex-1",
        isOver ? "text-foreground font-semibold" : isCurrent ? "text-foreground/60" : "text-muted-foreground",
      )}>
        {cfg.label}
      </span>
      {isOver && (
        <span className="text-[10px] text-white/50">soltar aqui ↓</span>
      )}
    </div>
  );
}

// ── Draggable card ──────────────────────────────────────────────────────────

function DraggableCard({ lead, isDragging, groupPartnerName, onAdvance, onWhatsApp }: { lead: Lead; isDragging?: boolean; groupPartnerName?: string; onAdvance?: (e: React.MouseEvent) => void; onWhatsApp?: (e: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const stageTasks = lead.tasks.filter((t) => t.stage === lead.stage);
  const completed = stageTasks.filter((t) => t.completed).length;

  const nextActionCfg = lead.nextAction ? NEXT_ACTION_CONFIG[lead.nextAction] : null;
  const waitingForCfg = lead.waitingFor ? WAITING_FOR_CONFIG[lead.waitingFor] : null;
  const isInVisaProcess = STAGE_CONFIG[lead.stage]?.phase === "visa";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "glass-card rounded-lg p-3 cursor-grab active:cursor-grabbing space-y-2.5 select-none group",
        isDragging && "opacity-30",
        isInVisaProcess && "border border-emerald-500/30 bg-emerald-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
            {initials(lead.fullName)}
          </div>
          <div>
            <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
              <span
                title={lead.fullName}
                className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors block max-w-[140px]"
              >
                {lead.fullName}
              </span>
            </Link>
            {groupPartnerName && (
              <span className="text-[10px] text-muted-foreground">
                {lead.groupType === "couple" ? "👫" : "👨‍👩‍👧"} {groupPartnerName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => onWhatsApp?.(e)}
            title="Enviar WhatsApp"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
          >
            <Phone className="w-3 h-3" />
          </button>
          <TemperatureBadge temp={lead.temperature} className="text-[10px] px-1.5 py-0.5" />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <p className="text-xs text-muted-foreground truncate flex-1">
          {lead.enrollments?.find((e) => e.course?.trim())?.course ?? lead.courseInterest}
        </p>
        {isInVisaProcess && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
            🛂 Em Visto
          </span>
        )}
      </div>

      {/* Next Action + Waiting For badges */}
      {(nextActionCfg || waitingForCfg) && (
        <div className="flex flex-wrap gap-1">
          {nextActionCfg && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-medium text-primary">
              {nextActionCfg.icon} {nextActionCfg.label}
            </span>
          )}
          {waitingForCfg && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-medium text-amber-300">
              {waitingForCfg.icon} {waitingForCfg.label}
            </span>
          )}
        </div>
      )}

      <div className="space-y-1">
        {/* Primary stage */}
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STAGE_CONFIG[lead.stage].dot)} />
          <span className={cn("text-[10px] font-medium truncate flex-1", STAGE_CONFIG[lead.stage].color)}>
            {STAGE_CONFIG[lead.stage].label}
          </span>
          {onAdvance && (
            <button
              onClick={onAdvance}
              title="Avançar para próximo estágio"
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-3 h-3" /> Avançar
            </button>
          )}
        </div>
        {/* Additional completed stages */}
        {lead.completedStages && lead.completedStages.filter((s) => s !== lead.stage).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-60", STAGE_CONFIG[s]?.dot)} />
            <span className={cn("text-[10px] truncate flex-1 opacity-70", STAGE_CONFIG[s]?.color)}>
              ✓ {STAGE_CONFIG[s]?.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <CheckSquare className="w-3 h-3" />
            {completed}/{stageTasks.length}
          </span>
          {lead.notesList.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {lead.notesList.length}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(lead.updatedAt, "relative")}
        </span>
      </div>

      {stageTasks.length > 0 && (
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${Math.round((completed / stageTasks.length) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  return (
    <Suspense>
      <PipelineInner />
    </Suspense>
  );
}

function PipelineInner() {
  const { leads, updateLead } = useCRM();
  const searchParams = useSearchParams();
  const consultantFilter = searchParams.get("consultant") ?? "";
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeOverId, setActiveOverId] = useState<string | null>(null);
  const [waLead, setWaLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function handleDragOver({ over }: DragOverEvent) {
    setActiveOverId(over ? String(over.id) : null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    setActiveOverId(null);
    if (!over) return;

    const leadId = String(active.id);
    const overId = String(over.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Dropped on a stage row
    if (overId.startsWith("stage::")) {
      const targetStage = overId.replace("stage::", "") as PipelineStage;
      if (lead.stage !== targetStage) {
        if (lead.groupId) {
          const groupLeads = leads.filter((l) => l.groupId === lead.groupId);
          groupLeads.forEach((l) => updateLead(l.id, { stage: targetStage }));
          const emoji = lead.groupType === "couple" ? "👫" : "👨‍👩‍👧";
          toast.success(`${emoji} Grupo movido para "${STAGE_CONFIG[targetStage].label}"`);
        } else {
          updateLead(leadId, { stage: targetStage });
          toast.success(`Movido para "${STAGE_CONFIG[targetStage].label}"`);
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {waLead && <WhatsAppTemplateModal lead={waLead} isOpen={!!waLead} onClose={() => setWaLead(null)} />}
      {consultantFilter && (
        <div className="flex items-center gap-2 px-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground">Pipeline de:</span>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{consultantFilter}</span>
          <Link href="/pipeline" className="text-xs text-muted-foreground hover:text-foreground underline">Limpar filtro</Link>
        </div>
      )}
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1 scrollbar-thin touch-pan-x select-none">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {PHASE_ORDER.map((phase) => {
          const cfg = PHASE_CONFIG[phase];
          const visibleLeads = consultantFilter
            ? leads.filter((l) => l.assignedConsultant === consultantFilter)
            : leads;
          const phaseLeads = visibleLeads.filter((l) => STAGE_CONFIG[l.stage].phase === phase);

          return (
            <div key={phase} className="flex-shrink-0 w-72 flex flex-col gap-2">
              {/* Header with droppable stage rows */}
              <div className={cn("rounded-xl p-3 border", cfg.headerBg)}>
                <div className="flex items-center justify-between mb-2">
                  <p className={cn("text-sm font-semibold", cfg.color)}>{cfg.label}</p>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full bg-white/10", cfg.color)}>
                    {phaseLeads.length}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {cfg.stages.map((s) => (
                    <DroppableStageRow
                      key={s}
                      stage={s}
                      activeOverId={activeOverId}
                      draggedStage={activeLead?.stage}
                    />
                  ))}
                </div>
              </div>

              {/* Cards — only show group primaries; members are hidden */}
              <div className="flex flex-col gap-2 min-h-[60px] p-1">
                {(() => {
                  return phaseLeads.filter((l) => {
                    // Non-primary group members are never shown as cards
                    if (l.groupId && l.groupRole === "member") return false;
                    return true;
                  }).map((lead) => {
                    // Show ALL group members' first names (regardless of their stage)
                    const groupPartners = lead.groupId
                      ? leads.filter((l) => l.groupId === lead.groupId && l.id !== lead.id)
                      : [];
                    const partnerName = groupPartners.map((p) => p.fullName.split(" ")[0]).join(", ");
                    const sortedStages = ALL_STAGES.slice().sort((a, b) => STAGE_CONFIG[a].order - STAGE_CONFIG[b].order);
                    const currentIdx = sortedStages.indexOf(lead.stage);
                    const nextStage = sortedStages.find((s, i) => i > currentIdx) ?? null;
                    return (
                      <DraggableCard
                        key={lead.id}
                        lead={lead}
                        isDragging={lead.id === activeId}
                        groupPartnerName={partnerName || undefined}
                        onWhatsApp={(e) => { e.stopPropagation(); setWaLead(lead); }}
                        onAdvance={nextStage ? (e) => {
                          e.stopPropagation();
                          if (lead.groupId) {
                            leads.filter((l) => l.groupId === lead.groupId).forEach((l) => updateLead(l.id, { stage: nextStage }));
                          } else {
                            updateLead(lead.id, { stage: nextStage });
                          }
                          toast.success(`→ ${STAGE_CONFIG[nextStage].label}`);
                        } : undefined}
                      />
                    );
                  });
                })()}
                {phaseLeads.length === 0 && !activeId && (
                  <div className="border-2 border-dashed border-border/40 rounded-xl h-12 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground/60">No leads</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeLead && (
            <div className="rotate-1 shadow-2xl w-72">
              <DraggableCard lead={activeLead} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
    </div>
  );
}
