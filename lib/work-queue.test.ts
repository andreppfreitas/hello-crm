import { describe, it, expect } from "vitest";
import type { Lead, Reminder } from "@/types";
import { buildWorkQueue, queueCounts } from "./work-queue";
import { logContact, contactSummary } from "./contact-log";
import { TASK_TEMPLATES } from "./constants";

const NOW = new Date("2026-08-14T12:00:00Z").getTime();
const dias = (n: number) => new Date(NOW + n * 86400000).toISOString();

const lead = (over: Partial<Lead>): Lead => ({
  id: "x", fullName: "Aluno Teste", phone: "+61400000000", email: "a@b.com", country: "Brazil",
  source: "Instagram", temperature: "warm", stage: "followup", assignedConsultant: "André", notes: "",
  tasks: [], contactHistory: [], payments: [], documents: [], notesList: [],
  stageHistory: [], stageChanges: [], visaChecklist: [],
  createdAt: dias(-90), updatedAt: dias(-1), lastContactAt: dias(-1),
  ...over,
} as Lead);

/**
 * Lead com os passos da etapa já esgotados.
 * O passo da corrente tem precedência na fila, então só sem ele dá para
 * observar os motivos mais fracos (travado, sem contato).
 */
const semPassosAbertos = (over: Partial<Lead>): Lead => {
  const l = lead(over);
  return {
    ...l,
    tasks: TASK_TEMPLATES[l.stage].map((title, i) => ({
      id: `chain-${l.stage}-${i}`, title, completed: true, stage: l.stage, chain: true, stepIndex: i,
    })),
  };
};

const reminder = (over: Partial<Reminder>): Reminder => ({
  id: "r", leadId: "x", leadName: "Aluno Teste", type: "call", note: "Ligar",
  dueAt: dias(0), completed: false, createdAt: dias(-1), authorName: "André",
  ...over,
} as Reminder);

describe("ordem da fila", () => {
  it("lembrete atrasado vem antes de tudo, e o atraso aparece", () => {
    const q = buildWorkQueue(
      [lead({ id: "a" }), lead({ id: "b", visaExpiryDate: dias(5) })],
      [reminder({ id: "r1", leadId: "a", dueAt: dias(-5), note: "Cobrar cotação" })],
      NOW
    );
    expect(q[0]).toMatchObject({ kind: "reminder", reason: "atrasado 5d", overdue: true });
  });

  it("visto vencendo em até 7 dias supera lembrete de hoje", () => {
    const q = buildWorkQueue(
      [lead({ id: "a" }), lead({ id: "b", visaExpiryDate: dias(3) })],
      [reminder({ id: "r1", leadId: "a", dueAt: dias(0) })],
      NOW
    );
    expect(q[0].kind).toBe("visa");
  });

  it("lembrete futuro e lembrete concluído ficam de fora", () => {
    const q = buildWorkQueue([lead({ id: "a" })], [
      reminder({ id: "r1", leadId: "a", dueAt: dias(5) }),
      reminder({ id: "r2", leadId: "a", dueAt: dias(-3), completed: true }),
    ], NOW);
    expect(q.filter((i) => i.kind === "reminder")).toHaveLength(0);
  });
});

describe("quem entra e quem não entra", () => {
  it("aluno que já fechou sai da fila", () => {
    const fechados = [
      lead({ id: "a", stage: "visa_granted" }),
      lead({ id: "b", temperature: "closed" }),
    ];
    expect(buildWorkQueue(fechados, [], NOW)).toHaveLength(0);
  });

  it("membro de casal não duplica a oportunidade", () => {
    const q = buildWorkQueue([
      lead({ id: "p", fullName: "Primary", groupId: "g", groupRole: "primary", lastContactAt: dias(-30) }),
      lead({ id: "m", fullName: "Member", groupId: "g", groupRole: "member", lastContactAt: dias(-30) }),
    ], [], NOW);
    expect(q.map((i) => i.leadId)).toEqual(["p"]);
  });

  it("travado só conta depois de 3 dias parado, e mostra há quanto tempo", () => {
    const recente = buildWorkQueue([semPassosAbertos({ waitingFor: "school", lastContactAt: dias(-1) })], [], NOW);
    expect(recente.filter((i) => i.kind === "stuck")).toHaveLength(0);

    const parado = buildWorkQueue([semPassosAbertos({ waitingFor: "school", lastContactAt: dias(-10) })], [], NOW);
    expect(parado[0]).toMatchObject({ kind: "stuck", reason: "parado há 10d" });
  });

  it("nunca contatado é dito com todas as letras", () => {
    const q = buildWorkQueue([semPassosAbertos({ lastContactAt: undefined, createdAt: dias(-40) })], [], NOW);
    expect(q[0].reason).toBe("nunca contatado");
  });
});

describe("alerta de visto", () => {
  const comVisto = (over: Partial<Lead> = {}) => lead({ visaExpiryDate: dias(10), ...over });

  it("aparece quando o vencimento se aproxima", () => {
    expect(buildWorkQueue([comVisto()], [], NOW).some((i) => i.kind === "visa")).toBe(true);
  });

  it("some enquanto estiver silenciado e volta quando o prazo passa", () => {
    // Vencimento é fato, não tarefa: só dá para adiar o alerta, não concluí-lo
    expect(buildWorkQueue([comVisto({ visaAlertSnoozedUntil: dias(7) })], [], NOW)
      .some((i) => i.kind === "visa")).toBe(false);
    expect(buildWorkQueue([comVisto({ visaAlertSnoozedUntil: dias(-1) })], [], NOW)
      .some((i) => i.kind === "visa")).toBe(true);
  });
});

describe("queueCounts", () => {
  it("conta por tipo e fecha com o total", () => {
    const q = buildWorkQueue([
      lead({ id: "a", visaExpiryDate: dias(4) }),
      lead({ id: "b", waitingFor: "school", lastContactAt: dias(-10) }),
    ], [reminder({ id: "r1", leadId: "a", dueAt: dias(-2) })], NOW);
    const c = queueCounts(q);
    expect(Object.values(c).reduce((s, n) => s + n, 0)).toBe(q.length);
    expect(c.visa).toBe(1);
  });
});

describe("registro de contato", () => {
  it("grava a data e põe o evento no topo sem perder o histórico", () => {
    const l = lead({ contactHistory: [{ id: "old", type: "call", summary: "antigo", authorName: "X", date: dias(-100) }] });
    const patch = logContact(l, "whatsapp", "WhatsApp: oi", "André");
    expect(Date.now() - new Date(patch.lastContactAt!).getTime()).toBeLessThan(5000);
    expect(patch.contactHistory![0].summary).toBe("WhatsApp: oi");
    expect(patch.contactHistory![1].id).toBe("old");
  });

  it("limita o histórico para não inchar o registro do aluno", () => {
    const muitos = Array.from({ length: 250 }, (_, i) => ({
      id: `e${i}`, type: "call" as const, summary: "s", authorName: "a", date: dias(-1),
    }));
    expect(logContact(lead({ contactHistory: muitos }), "call", "novo", "A").contactHistory).toHaveLength(200);
  });

  it("não colide id em envios seguidos", () => {
    const l = lead({});
    const a = logContact(l, "call", "x", "A").contactHistory![0].id;
    const b = logContact(l, "call", "x", "A").contactHistory![0].id;
    expect(a).not.toBe(b);
  });

  it("descreve o contato pelo template ou por um trecho da mensagem", () => {
    expect(contactSummary("whatsapp", "Boas-vindas", "qualquer")).toBe("WhatsApp: Boas-vindas");
    expect(contactSummary("email", null, "Olá tudo bem")).toBe("E-mail: Olá tudo bem");
    expect(contactSummary("whatsapp", null, "   ")).toBe("WhatsApp: conversa aberta");
    expect(contactSummary("whatsapp", null, "a".repeat(200))).toMatch(/…$/);
  });
});
