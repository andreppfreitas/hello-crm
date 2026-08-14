"use client";

import { useEffect, useState } from "react";
import { PHASE_ORDER, PHASE_CONFIG, STAGE_CONFIG, TASK_TEMPLATES } from "@/lib/constants";
import type { PipelineStage } from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Trash2, RotateCcw, GripVertical, Loader2 } from "lucide-react";

/**
 * Edição dos passos do processo por etapa.
 * Salvar vazio devolve a etapa ao padrão do sistema.
 */
export function StageStepsTab({ isAdmin }: { isAdmin: boolean }) {
  const [custom, setCustom] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<PipelineStage | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/stage-steps")
      .then((r) => r.json())
      .then((d) => setCustom(d.steps ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stepsOf = (s: PipelineStage) => custom[s]?.length ? custom[s] : TASK_TEMPLATES[s];

  function edit(stage: PipelineStage) {
    setOpen(stage);
    setDraft([...stepsOf(stage)]);
  }

  async function save(stage: PipelineStage, steps: string[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/stage-steps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, steps }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao salvar"); return; }
      setCustom((c) => {
        const next = { ...c };
        if (data.steps.length === 0) delete next[stage];
        else next[stage] = data.steps;
        return next;
      });
      setOpen(null);
      toast.success(
        data.steps.length === 0
          ? "Etapa devolvida ao padrão"
          : "Passos salvos — valem para os próximos alunos que chegarem nesta etapa"
      );
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  }

  if (loading) {
    return <div className="glass-card rounded-xl p-6"><p className="text-sm text-muted-foreground">Carregando…</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5 space-y-2">
        <h2 className="text-base font-semibold">Passos do processo</h2>
        <p className="text-sm text-muted-foreground">
          Cada aluno tem um passo aberto por vez. Ao concluir, o próximo desta lista nasce sozinho;
          quando acabam, o sistema oferece avançar de etapa.
        </p>
        {!isAdmin && (
          <p className="text-xs text-amber-400">Só administradores podem alterar os passos.</p>
        )}
      </div>

      {PHASE_ORDER.map((phase) => (
        <div key={phase} className="glass-card rounded-xl p-5 space-y-3">
          <div className={cn("inline-flex px-3 py-1 rounded-lg border w-fit", PHASE_CONFIG[phase].headerBg)}>
            <h3 className={cn("text-sm font-semibold", PHASE_CONFIG[phase].color)}>{PHASE_CONFIG[phase].label}</h3>
          </div>

          <div className="space-y-2">
            {PHASE_CONFIG[phase].stages.map((stage) => {
              const steps = stepsOf(stage);
              const edited = !!custom[stage]?.length;
              const isOpen = open === stage;

              return (
                <div key={stage} className={cn(
                  "rounded-xl border p-3.5 space-y-2.5",
                  isOpen ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/20"
                )}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STAGE_CONFIG[stage].dot)} />
                      <p className="text-sm font-medium text-foreground truncate">{STAGE_CONFIG[stage].label}</p>
                      {edited && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 flex-shrink-0">
                          editado
                        </span>
                      )}
                    </div>
                    {isAdmin && !isOpen && (
                      <button onClick={() => edit(stage)} className="text-xs text-primary hover:underline flex-shrink-0">
                        Editar
                      </button>
                    )}
                  </div>

                  {!isOpen ? (
                    <ol className="space-y-1 pl-1">
                      {steps.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-muted-foreground/50 tabular-nums">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="space-y-2">
                      {draft.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="flex flex-col flex-shrink-0">
                            <button onClick={() => move(i, -1)} disabled={i === 0}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-25 leading-none text-[10px]">▲</button>
                            <button onClick={() => move(i, 1)} disabled={i === draft.length - 1}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-25 leading-none text-[10px]">▼</button>
                          </div>
                          <GripVertical className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                          <input
                            value={s}
                            onChange={(e) => setDraft((d) => d.map((x, j) => j === i ? e.target.value : x))}
                            className="flex-1 min-w-0 text-sm bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
                          />
                          <button
                            onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => setDraft((d) => [...d, ""])}
                        disabled={draft.length >= 12}
                        className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" /> Adicionar passo
                      </button>

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <Button size="sm" disabled={saving} onClick={() => save(stage, draft)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90">
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salvar"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setOpen(null)}>Cancelar</Button>
                        {edited && (
                          <Button size="sm" variant="ghost" onClick={() => save(stage, [])}
                            className="text-muted-foreground gap-1.5">
                            <RotateCcw className="w-3 h-3" /> Voltar ao padrão
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
