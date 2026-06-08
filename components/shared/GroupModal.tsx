"use client";

import { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Users, Heart, X, Link2, Unlink, Crown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCRM } from "@/contexts/CRMContext";
import type { Lead } from "@/types";
import { toast } from "sonner";

interface Props {
  lead: Lead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const GROUP_TYPES = [
  { id: "couple" as const, label: "Casal",   icon: Heart,  emoji: "👫", desc: "Duas pessoas em relacionamento" },
  { id: "family" as const, label: "Família", icon: Users,  emoji: "👨‍👩‍👧", desc: "Três ou mais membros da família" },
];

type Step = "select" | "primary" | "done";

export function GroupModal({ lead, open, onOpenChange }: Props) {
  const { leads, updateLead } = useCRM();
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupType, setGroupType] = useState<"couple" | "family">("couple");
  const [primaryId, setPrimaryId] = useState<string>(lead.id);
  const [step, setStep]           = useState<Step>("select");

  const isGrouped = !!lead.groupId;

  // All current group members (including self)
  const groupMembers = useMemo(() =>
    lead.groupId ? leads.filter((l) => l.groupId === lead.groupId) : [],
    [leads, lead.groupId]
  );

  // Available leads to link
  const candidates = useMemo(() =>
    leads.filter((l) =>
      l.id !== lead.id &&
      (!l.groupId || l.groupId === lead.groupId) &&
      l.fullName.toLowerCase().includes(search.toLowerCase())
    ),
    [leads, lead.id, lead.groupId, search]
  );

  // All leads that will be in the new group
  const allNewMembers = useMemo(() =>
    [lead, ...selected.map((id) => leads.find((l) => l.id === id)!).filter(Boolean)],
    [lead, selected, leads]
  );

  function reset() {
    setSearch(""); setSelected([]); setGroupType("couple");
    setPrimaryId(lead.id); setStep("select");
  }

  function handleLink() {
    const groupId = lead.groupId ?? `grp-${Date.now()}`;
    const allIds = allNewMembers.map((l) => l.id);
    allIds.forEach((id) => {
      updateLead(id, {
        groupId,
        groupType,
        groupRole: id === primaryId ? "primary" : "member",
      });
    });
    const primaryName = allNewMembers.find((l) => l.id === primaryId)?.fullName ?? "";
    toast.success(`Grupo criado! Estudante principal: ${primaryName}`);
    onOpenChange(false);
    reset();
  }

  function handleSetPrimary(id: string) {
    // Change primary within existing group
    const allMembers = leads.filter((l) => l.groupId === lead.groupId);
    allMembers.forEach((l) => {
      updateLead(l.id, { groupRole: l.id === id ? "primary" : "member" });
    });
    toast.success("Estudante principal atualizado!");
  }

  function handleUnlink() {
    const allMembers = leads.filter((l) => l.groupId === lead.groupId);
    allMembers.forEach((l) => {
      updateLead(l.id, { groupId: undefined, groupType: undefined, groupRole: undefined });
    });
    toast.success("Grupo desfeito");
    onOpenChange(false);
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 glass-card rounded-2xl border border-border shadow-2xl p-0 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold">
                {isGrouped ? "Gerenciar Grupo" : "Vincular como Casal / Família"}
              </h2>
            </div>
            <Dialog.Close className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <div className="p-6 space-y-5">

            {/* ── ALREADY GROUPED ── */}
            {isGrouped ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{lead.groupType === "couple" ? "👫" : "👨‍👩‍👧"}</span>
                  <div>
                    <p className="font-medium text-sm">{lead.groupType === "couple" ? "Casal" : "Família"}</p>
                    <p className="text-xs text-muted-foreground">{groupMembers.length} membros neste grupo</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {groupMembers.map((m) => (
                    <MemberRow
                      key={m.id}
                      lead={m}
                      isPrimary={m.groupRole === "primary"}
                      onSetPrimary={m.groupRole !== "primary" ? () => handleSetPrimary(m.id) : undefined}
                    />
                  ))}
                </div>

                <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  💡 Clique em <strong>"Tornar principal"</strong> para trocar o estudante que rege o pipeline
                </p>

                <div className="pt-1 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleUnlink}
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Desfazer Grupo
                  </Button>
                  <Dialog.Close asChild>
                    <Button variant="outline" className="flex-1">Fechar</Button>
                  </Dialog.Close>
                </div>
              </div>

            ) : step === "select" ? (
              /* ── STEP 1: SELECT TYPE + MEMBERS ── */
              <>
                {/* Type */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de grupo</p>
                  <div className="grid grid-cols-2 gap-3">
                    {GROUP_TYPES.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGroupType(g.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                          groupType === g.id ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"
                        )}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <div>
                          <p className="text-sm font-medium">{g.label}</p>
                          <p className="text-xs text-muted-foreground">{g.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Selecionar {groupType === "couple" ? "parceiro(a)" : "membros da família"}
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar lead pelo nome..."
                      className="pl-9 bg-secondary/50"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                    {candidates.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma lead encontrada</p>
                    )}
                    {candidates.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => toggleSelect(l.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left",
                          selected.includes(l.id)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-white/5"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {l.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{l.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{l.email || l.phone}</p>
                        </div>
                        {selected.includes(l.id) && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {selected.length > 0 && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm">
                    <span className="font-medium">{lead.fullName}</span>
                    {selected.map((id) => {
                      const m = leads.find((l) => l.id === id);
                      return m ? <span key={id}> & <span className="font-medium">{m.fullName}</span></span> : null;
                    })}
                    <span className="text-muted-foreground"> serão vinculados como {groupType === "couple" ? "casal 👫" : "família 👨‍👩‍👧"}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Dialog.Close asChild>
                    <Button variant="outline" className="flex-1">Cancelar</Button>
                  </Dialog.Close>
                  <Button
                    onClick={() => { setPrimaryId(lead.id); setStep("primary"); }}
                    disabled={selected.length === 0}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Próximo: Escolher principal
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </>

            ) : (
              /* ── STEP 2: CHOOSE PRIMARY ── */
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <p className="text-sm font-semibold">Quem é o estudante principal?</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O pipeline e os acompanhamentos serão regidos pelo estudante principal. Os outros membros ficam vinculados mas não aparecem como cards separados.
                  </p>
                </div>

                <div className="space-y-2">
                  {allNewMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPrimaryId(m.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        primaryId === m.id
                          ? "border-amber-400 bg-amber-400/10"
                          : "border-border hover:border-foreground/30"
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {m.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email || m.phone || m.courseInterest}</p>
                      </div>
                      {primaryId === m.id ? (
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Crown className="w-4 h-4" />
                          <span className="text-xs font-semibold">Principal</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Vinculado</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>
                    Voltar
                  </Button>
                  <Button
                    onClick={handleLink}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Vincular grupo
                  </Button>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MemberRow({
  lead,
  isPrimary,
  onSetPrimary,
}: {
  lead: Lead;
  isPrimary: boolean;
  onSetPrimary?: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
      isPrimary ? "bg-amber-400/10 border-amber-400/30" : "bg-secondary/30 border-border"
    )}>
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
        {lead.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{lead.fullName}</p>
        <p className="text-xs text-muted-foreground">{lead.email || lead.phone}</p>
      </div>
      {isPrimary ? (
        <div className="flex items-center gap-1 text-amber-400">
          <Crown className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">Principal</span>
        </div>
      ) : onSetPrimary ? (
        <button
          onClick={onSetPrimary}
          className="text-xs text-primary hover:underline whitespace-nowrap"
        >
          Tornar principal
        </button>
      ) : (
        <span className="text-xs text-muted-foreground">Vinculado</span>
      )}
    </div>
  );
}
