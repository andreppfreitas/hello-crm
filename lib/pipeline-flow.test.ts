import { describe, it, expect } from "vitest";
import { STAGE_CONFIG, PHASE_CONFIG, PHASE_ORDER, TASK_TEMPLATES } from "./constants";
import { STAGE_SEQUENCE, nextStage } from "./work-queue";
import type { PipelineStage } from "@/types";

/**
 * Invariantes do fluxo do processo.
 *
 * Estes testes existem porque a troca de Payments com Documents quebrou três
 * emendas em silêncio: uma etapa pedia um depósito já pago, outra mandava
 * protocolar o visto antes da hora, e a assinatura do contrato caía depois de
 * três pagamentos. Mexer na ordem das fases é barato; descobrir que quebrou
 * o processo semanas depois, não.
 */

describe("estrutura do pipeline", () => {
  it("tem 29 etapas, sem perder nem duplicar nenhuma", () => {
    expect(STAGE_SEQUENCE).toHaveLength(29);
    expect(new Set(STAGE_SEQUENCE).size).toBe(29);
  });

  it("a união das fases é exatamente a sequência", () => {
    const daFases = PHASE_ORDER.flatMap((p) => PHASE_CONFIG[p].stages);
    expect([...daFases].sort()).toEqual([...STAGE_SEQUENCE].sort());
  });

  it("cada etapa declara a fase em que realmente está", () => {
    const erradas = STAGE_SEQUENCE.filter(
      (s) => !PHASE_CONFIG[STAGE_CONFIG[s].phase].stages.includes(s)
    );
    expect(erradas).toEqual([]);
  });

  it("o campo order acompanha a posição real no fluxo", () => {
    // order alimenta o lead score — desalinhado, pontua o aluno errado
    const desalinhadas = STAGE_SEQUENCE.filter((s, i) => STAGE_CONFIG[s].order !== i + 1);
    expect(desalinhadas).toEqual([]);
  });

  it("toda etapa tem passos, e só a última não tem próxima", () => {
    for (const s of STAGE_SEQUENCE) {
      expect(TASK_TEMPLATES[s]?.length, `${s} sem passos`).toBeGreaterThan(0);
    }
    expect(nextStage(STAGE_SEQUENCE[STAGE_SEQUENCE.length - 1])).toBeNull();
    expect(nextStage("new_lead")).toBe("first_contact");
  });
});

describe("emendas entre fases", () => {
  const antes = (a: PipelineStage, b: PipelineStage) =>
    STAGE_SEQUENCE.indexOf(a) < STAGE_SEQUENCE.indexOf(b);

  it("o aluno assina o contrato antes de pagar qualquer coisa", () => {
    expect(antes("documents_signed", "coe_deposit_paid")).toBe(true);
    expect(antes("documents_signed", "oshc_payment")).toBe(true);
    expect(antes("documents_signed", "visa_fee_paid")).toBe(true);
  });

  it("o contrato é enviado antes de ser assinado", () => {
    expect(antes("contract_sent", "documents_signed")).toBe(true);
  });

  it("assinatura leva ao depósito, e o depósito vem logo em seguida", () => {
    expect(nextStage("read_carefully_email")).toBe("documents_signed");
    expect(nextStage("documents_signed")).toBe("coe_deposit_paid");
  });

  it("paga a taxa de visto, então prepara os documentos do visto", () => {
    expect(nextStage("visa_fee_paid")).toBe("visa_checklist_sent");
  });

  it("documentos completos levam direto ao protocolo", () => {
    expect(nextStage("documents_complete")).toBe("visa_lodged");
  });

  it("todos os pagamentos acontecem antes dos documentos do visto", () => {
    expect(antes("visa_fee_paid", "visa_checklist_sent")).toBe(true);
    expect(antes("coe_issued", "gs_letter_draft_sent")).toBe(true);
  });
});

describe("conteúdo dos passos", () => {
  const passos = (s: PipelineStage) => TASK_TEMPLATES[s].join(" | ");

  it("nenhuma etapa pede algo que já aconteceu", () => {
    // 'Documents Complete' pedia o depósito do CoE, pago 11 etapas antes
    expect(passos("documents_complete")).not.toMatch(/dep[óo]sito/i);
    // 'Visa Fee Paid' mandava protocolar, mas o protocolo é 6 etapas depois
    expect(passos("visa_fee_paid")).not.toMatch(/protocol/i);
  });

  it("quem pede o depósito é a etapa imediatamente anterior a ele", () => {
    expect(passos("documents_signed")).toMatch(/dep[óo]sito/i);
  });

  it("o protocolo do visto é pedido na etapa de protocolo", () => {
    expect(passos("visa_lodged")).toMatch(/protocolar/i);
  });

  it("está tudo em português", () => {
    const verbosIngles = /\b(Send|Confirm|Review|Request|Follow|Prepare|Receive|Collect|Notify|Monitor|Draft|Store|Explain|Add|Verify|Assign|Check|Issue|Submit|Provide|Finalize|Await|Complete|Contact|Calculate|Set)\b/;
    const emIngles = STAGE_SEQUENCE.flatMap((s) => TASK_TEMPLATES[s]).filter((t) => verbosIngles.test(t));
    expect(emIngles).toEqual([]);
  });
});
