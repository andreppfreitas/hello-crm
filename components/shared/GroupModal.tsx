"use client";

import { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Users, Heart, X, Link2, Unlink } from "lucide-react";
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

export function GroupModal({ lead, open, onOpenChange }: Props) {
  const { leads, updateLead } = useCRM();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupType, setGroupType] = useState<"couple" | "family">("couple");
  const [step, setStep] = useState<"select" | "confirm">("select");

  const isGrouped = !!lead.groupId;

  // Available leads to link (not already grouped with this lead, not self)
  const candidates = useMemo(() =>
    leads.filter((l) =>
      l.id !== lead.id &&
      (!l.groupId || l.groupId === lead.groupId) &&
      l.fullName.toLowerCase().includes(search.toLowerCase())
    ),
    [leads, lead.id, lead.groupId, search]
  );

  // Current group members
  const groupMembers = useMemo(() =>
    lead.groupId ? leads.filter((l) => l.groupId === lead.groupId && l.id !== lead.id) : [],
    [leads, lead.groupId]
  );

  function handleLink() {
    const groupId = `grp-${Date.now()}`;
    const allIds = [lead.id, ...selected];
    // Determine primary = current lead
    allIds.forEach((id, i) => {
      updateLead(id, {
        groupId,
        groupType,
        groupRole: i === 0 ? "primary" : "member",
      });
    });
    toast.success(`Grupo "${GROUP_TYPES.find(g => g.id === groupType)?.label}" criado com sucesso!`);
    onOpenChange(false);
    setSelected([]);
    setStep("select");
    setSearch("");
  }

  function handleUnlink() {
    // Remove all from group
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
            {/* Already grouped — show members + unlink option */}
            {isGrouped ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{lead.groupType === "couple" ? "👫" : "👨‍👩‍👧"}</span>
                  <div>
                    <p className="font-medium text-sm">{lead.groupType === "couple" ? "Casal" : "Família"}</p>
                    <p className="text-xs text-muted-foreground">{groupMembers.length + 1} membros neste grupo</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Current lead */}
                  <MemberRow lead={lead} role="primary" />
                  {/* Other members */}
                  {groupMembers.map((m) => <MemberRow key={m.id} lead={m} role="member" />)}
                </div>

                <div className="pt-2 flex gap-3">
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
            ) : (
              <>
                {/* Step 1: Select type */}
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

                {/* Step 2: Search and select leads */}
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

                  <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-thin">
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

                {/* Selected preview */}
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
                    onClick={handleLink}
                    disabled={selected.length === 0}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Vincular
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

function MemberRow({ lead, role }: { lead: Lead; role: "primary" | "member" }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30">
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
        {lead.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{lead.fullName}</p>
        <p className="text-xs text-muted-foreground">{lead.email || lead.phone}</p>
      </div>
      {role === "primary" && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">Principal</span>
      )}
    </div>
  );
}
