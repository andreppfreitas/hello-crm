import { describe, it, expect, beforeEach } from "vitest";
import type { Lead } from "@/types";
import { TASK_TEMPLATES } from "./constants";
import {
  buildChainTask, firstChainTask, openChainTask, chainProgress,
  advanceChain, setStepOverrides, stepsFor,
} from "./task-chain";
import { buildWorkQueue } from "./work-queue";
import { buildNewLead } from "./lead-builder";

const base = {
  fullName: "Ana Nova", phone: "+61400000000", email: "a@b.com", country: "Brazil",
  source: "Instagram" as const, temperature: "warm" as const,
  assignedConsultant: "André Perez", notes: "",
};

beforeEach(() => setStepOverrides({}));

describe("primeiro elo: lead novo", () => {
  it("nasce com o primeiro passo aberto", () => {
    const lead = buildNewLead({ ...base, stage: "new_lead" } as never);
    expect(lead.tasks).toHaveLength(1);
    expect(lead.tasks[0]).toMatchObject({ chain: true, completed: false, title: TASK_TEMPLATES.new_lead[0] });
  });

  it("já entra na fila de trabalho na hora, não depois de 7 dias", () => {
    // Antes da corrente, um lead recém-criado ficava invisível até acumular
    // dias sem contato — o consultor não via o trabalho mais fresco que tinha.
    const lead = buildNewLead({ ...base, stage: "new_lead" } as never);
    const fila = buildWorkQueue([lead], []);
    expect(fila).toHaveLength(1);
    expect(fila[0]).toMatchObject({ kind: "step", task: TASK_TEMPLATES.new_lead[0] });
    expect(fila[0].reason).toContain("passo 1/3");
  });
});

describe("elo do meio: concluir gera o próximo", () => {
  it("cria o passo seguinte e mantém só um aberto", () => {
    let lead = buildNewLead({ ...base, stage: "new_lead" } as never);

    const r1 = advanceChain(lead, lead.tasks[0].id);
    expect(r1.next?.title).toBe(TASK_TEMPLATES.new_lead[1]);
    expect(r1.stageComplete).toBe(false);
    lead = { ...lead, tasks: r1.tasks };
    expect(lead.tasks.filter((t) => !t.completed)).toHaveLength(1);
    expect(chainProgress(lead)).toEqual({ done: 1, total: 3 });

    const r2 = advanceChain(lead, openChainTask(lead)!.id);
    expect(r2.next?.title).toBe(TASK_TEMPLATES.new_lead[2]);
  });
});

describe("último elo: fim da etapa", () => {
  it("sinaliza que a etapa acabou e sai da fila", () => {
    let lead = buildNewLead({ ...base, stage: "new_lead" } as never);
    for (let i = 0; i < 3; i++) {
      lead = { ...lead, tasks: advanceChain(lead, openChainTask(lead)!.id).tasks };
    }
    expect(openChainTask(lead)).toBeUndefined();
    expect(chainProgress(lead)).toEqual({ done: 3, total: 3 });
    expect(buildWorkQueue([lead], []).filter((i) => i.kind === "step")).toHaveLength(0);
  });

  it("a nova etapa recomeça a corrente do zero", () => {
    const lead = buildNewLead({ ...base, stage: "new_lead" } as never);
    const naNova = { ...lead, stage: "first_contact" as const, tasks: [firstChainTask("first_contact")!] };
    expect(openChainTask(naNova)?.title).toBe(TASK_TEMPLATES.first_contact[0]);
    expect(chainProgress(naNova)).toEqual({ done: 0, total: 3 });
  });
});

describe("leads criados antes da corrente", () => {
  // Os alunos que já existiam não têm passo gravado. Em vez de migrar o banco,
  // o passo aparece virtualmente e só é persistido quando concluído.
  const antigo = { ...buildNewLead({ ...base, stage: "quotation_prepared" } as never), tasks: [] } as Lead;

  it("ganha o passo virtual sem escrever no banco", () => {
    const passo = openChainTask(antigo);
    expect(passo?.title).toBe(TASK_TEMPLATES.quotation_prepared[0]);
    expect(passo?.id.endsWith("-v")).toBe(true);
    expect(antigo.tasks).toHaveLength(0);
  });

  it("aparece na fila igual aos demais", () => {
    expect(buildWorkQueue([antigo], []).filter((i) => i.kind === "step")).toHaveLength(1);
  });

  it("ao concluir, grava o passo feito e já abre o próximo", () => {
    const r = advanceChain(antigo, openChainTask(antigo)!.id);
    expect(r.tasks).toHaveLength(2);
    expect(r.tasks[0].completed).toBe(true);
    expect(r.next?.title).toBe(TASK_TEMPLATES.quotation_prepared[1]);
    expect(r.next?.completed).toBe(false);
  });

  it("id desconhecido não quebra nem apaga tarefa", () => {
    const r = advanceChain(antigo, "id-que-nao-existe");
    expect(r.next).toBeNull();
    expect(r.tasks).toEqual(antigo.tasks);
  });
});

describe("passos customizados nas Configurações", () => {
  it("vencem os padrões do sistema", () => {
    setStepOverrides({ new_lead: ["Passo A", "Passo B"] });
    expect(stepsFor("new_lead")).toEqual(["Passo A", "Passo B"]);
    expect(buildChainTask("new_lead", 0)?.title).toBe("Passo A");
    expect(buildChainTask("new_lead", 2)).toBeNull(); // só dois passos agora
  });

  it("lista vazia volta ao padrão do sistema", () => {
    setStepOverrides({ new_lead: [] });
    expect(stepsFor("new_lead")).toEqual(TASK_TEMPLATES.new_lead);
  });

  it("o override explícito não vaza para outras chamadas", () => {
    // No servidor cada requisição passa o seu — não pode haver estado compartilhado
    expect(stepsFor("new_lead", { new_lead: ["Só desta vez"] })).toEqual(["Só desta vez"]);
    expect(stepsFor("new_lead")).toEqual(TASK_TEMPLATES.new_lead);
  });
});

describe("a fila mostra uma linha por aluno", () => {
  it("o passo do processo substitui travado e sem contato", () => {
    const lead = {
      ...buildNewLead({ ...base, stage: "followup" } as never),
      waitingFor: "school" as const,
      lastContactAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    const fila = buildWorkQueue([lead], []);
    expect(fila).toHaveLength(1);
    expect(fila[0].kind).toBe("step");
  });
});
