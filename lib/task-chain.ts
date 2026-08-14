import type { Lead, Task, PipelineStage } from "@/types";
import { TASK_TEMPLATES } from "./constants";

/**
 * Corrente de tarefas do processo.
 *
 * O aluno tem sempre UM passo aberto por vez. Ao concluir, o próximo passo da
 * etapa nasce sozinho. Quando os passos da etapa acabam, a corrente sinaliza que
 * é hora de avançar de etapa — aí a corrente recomeça com os passos da nova.
 *
 * A sequência de cada etapa vem de TASK_TEMPLATES, então mexer no processo é
 * mexer numa lista de strings, não no código.
 */

export type StepOverrides = Record<string, string[]>;

/**
 * Passos customizados nas Configurações. No cliente é hidratado uma vez pelo
 * CRMContext; no servidor as rotas passam o override explicitamente, para não
 * compartilhar estado entre requisições.
 */
let clientOverrides: StepOverrides = {};
export function setStepOverrides(steps: StepOverrides) {
  clientOverrides = steps ?? {};
}

/** Passos vigentes de uma etapa: o customizado vence o padrão. */
export function stepsFor(stage: PipelineStage, overrides?: StepOverrides): string[] {
  const custom = (overrides ?? clientOverrides)[stage];
  return custom?.length ? custom : TASK_TEMPLATES[stage] ?? [];
}

/** Monta o passo `index` da etapa. Null quando a etapa não tem mais passos. */
export function buildChainTask(stage: PipelineStage, index: number, overrides?: StepOverrides): Task | null {
  const steps = stepsFor(stage, overrides);
  if (index < 0 || index >= steps.length) return null;
  return {
    id: `chain-${stage}-${index}-${Date.now()}`,
    title: steps[index],
    completed: false,
    stage,
    chain: true,
    stepIndex: index,
  };
}

/** Primeiro passo de uma etapa — usado ao criar o lead e ao mudar de etapa. */
export function firstChainTask(stage: PipelineStage, overrides?: StepOverrides): Task | null {
  return buildChainTask(stage, 0, overrides);
}

/**
 * O passo da corrente aberto agora.
 *
 * Se o lead não tem nenhum passo gravado — caso dos leads criados antes da
 * corrente existir — devolve o passo virtual correspondente, sem gravar nada.
 * Ele só é persistido quando você conclui, igual às tarefas automáticas.
 */
export function openChainTask(lead: Lead): Task | undefined {
  const stored = (lead.tasks ?? []).find(
    (t) => t.chain && !t.completed && t.stage === lead.stage
  );
  if (stored) return stored;

  const done = (lead.tasks ?? []).filter(
    (t) => t.chain && t.completed && t.stage === lead.stage
  ).length;
  const virtual = buildChainTask(lead.stage, done);
  return virtual ? { ...virtual, id: virtualStepId(lead.stage, done) } : undefined;
}

/** Id determinístico do passo virtual, para conseguir reconstruí-lo ao concluir. */
function virtualStepId(stage: PipelineStage, index: number): string {
  return `chain-${stage}-${index}-v`;
}

/** Reconstrói um passo virtual a partir do id. */
function parseVirtualId(id: string): { stage: PipelineStage; index: number } | null {
  const m = /^chain-(.+)-(\d+)-v$/.exec(id);
  if (!m) return null;
  return { stage: m[1] as PipelineStage, index: Number(m[2]) };
}

/** Quantos passos da etapa atual já foram concluídos. */
export function chainProgress(lead: Lead): { done: number; total: number } {
  const total = stepsFor(lead.stage).length;
  const done = (lead.tasks ?? []).filter(
    (t) => t.chain && t.completed && t.stage === lead.stage
  ).length;
  return { done: Math.min(done, total), total };
}

export interface ChainAdvance {
  tasks: Task[];
  /** Próximo passo criado, ou null se a etapa acabou. */
  next: Task | null;
  /** True quando não há mais passos — hora de avançar de etapa. */
  stageComplete: boolean;
}

/**
 * Conclui um passo e já cria o seguinte.
 * Se o id não for de um passo da corrente, apenas marca como concluído.
 */
export function advanceChain(lead: Lead, taskId: string): ChainAdvance {
  const now = new Date().toISOString();
  const stored = (lead.tasks ?? []).find((t) => t.id === taskId);

  // Passo virtual (lead anterior à corrente): grava-o já concluído
  if (!stored) {
    const parsed = parseVirtualId(taskId);
    const built = parsed ? buildChainTask(parsed.stage, parsed.index) : null;
    if (!parsed || !built) {
      return { tasks: lead.tasks ?? [], next: null, stageComplete: false };
    }
    const tasks = [...(lead.tasks ?? []), { ...built, completed: true, completedAt: now }];
    const next = buildChainTask(parsed.stage, parsed.index + 1);
    if (next) tasks.push(next);
    return { tasks, next, stageComplete: next === null };
  }

  const tasks = (lead.tasks ?? []).map((t) =>
    t.id === taskId ? { ...t, completed: true, completedAt: now } : t
  );
  if (!stored.chain) {
    return { tasks, next: null, stageComplete: false };
  }

  const next = buildChainTask(stored.stage, (stored.stepIndex ?? 0) + 1);
  if (next) tasks.push(next);
  return { tasks, next, stageComplete: next === null };
}

