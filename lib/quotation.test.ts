import { describe, it, expect } from "vitest";
import type { Quotation, QuotationCourse } from "@/types/quotation";
import {
  courseTotal, courseRemaining, installmentsTotal, computeTotals,
  quotationWarnings, estimateEndDate, formatQuotationNumber,
} from "./quotation";
import { parseQuotationText } from "./quotation-parser";

const curso = (over: Partial<QuotationCourse> = {}): QuotationCourse => ({
  id: "c1", school: "APC", course: "Diploma of Business",
  durationLabel: "2 anos", startDate: "2027-02-01",
  fees: [{ label: "Tuition", amount: 19000 }, { label: "Enrolment Fee", amount: 250 }],
  deposit: 500, installments: [], ...over,
});

const cotacao = (over: Partial<Quotation> = {}): Quotation => ({
  id: "q1", leadId: "l1", number: "HA-0001", packageName: "Pacote", city: "Sydney",
  currency: "AUD", courses: [curso()], visaCosts: [{ label: "Taxa do visto", amount: 2500 }],
  status: "draft", publicToken: "tok", createdBy: "André",
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

describe("totais", () => {
  it("soma as taxas do curso e desconta o que é desconto", () => {
    expect(courseTotal(curso())).toBe(19250);
    const comDesconto = curso({ fees: [
      { label: "Tuition", amount: 5280 },
      { label: "Material Fee", amount: 300 },
      { label: "Desconto fidelidade", amount: -100 },
    ]});
    expect(courseTotal(comDesconto)).toBe(5480);
  });

  it("saldo é o total menos a entrada, nunca negativo", () => {
    expect(courseRemaining(curso())).toBe(18750);
    expect(courseRemaining(curso({ deposit: 999999 }))).toBe(0);
  });

  it("separa o que paga agora do que fica parcelado", () => {
    const t = computeTotals(cotacao());
    expect(t.coursesTotal).toBe(19250);
    expect(t.depositTotal).toBe(500);
    expect(t.visaTotal).toBe(2500);
    expect(t.upfrontTotal).toBe(3000);    // entrada + visto
    expect(t.remainingTotal).toBe(18750);
    expect(t.grandTotal).toBe(21750);     // cursos + visto
  });

  it("soma as parcelas por faixa", () => {
    const c = curso({ installments: [{ count: 1, amount: 1250 }, { count: 11, amount: 1500 }, { count: 1, amount: 1000 }] });
    expect(installmentsTotal(c)).toBe(18750);
  });
});

describe("avisos antes de enviar ao aluno", () => {
  it("aceita uma cotação coerente sem reclamar", () => {
    const ok = cotacao({ courses: [curso({ installments: [{ count: 15, amount: 1250 }] })] });
    expect(quotationWarnings(ok)).toEqual([]);
  });

  it("avisa quando as parcelas não fecham com o saldo", () => {
    const errada = cotacao({ courses: [curso({ installments: [{ count: 10, amount: 1000 }] })] });
    expect(quotationWarnings(errada).join(" ")).toMatch(/parcelas somam/i);
  });

  it("tolera diferença de arredondamento da escola", () => {
    const quase = cotacao({ courses: [curso({ installments: [{ count: 1, amount: 18750.5 }] })] });
    expect(quotationWarnings(quase)).toEqual([]);
  });

  it("pega entrada maior que o curso, valor zerado e escola em branco", () => {
    expect(quotationWarnings(cotacao({ courses: [curso({ deposit: 99999 })] })).join(" ")).toMatch(/entrada maior/i);
    expect(quotationWarnings(cotacao({ courses: [curso({ fees: [] })] })).join(" ")).toMatch(/zerado/i);
    expect(quotationWarnings(cotacao({ courses: [curso({ school: "" })] })).join(" ")).toMatch(/escola/i);
  });

  it("avisa validade vencida e cotação sem curso", () => {
    expect(quotationWarnings(cotacao({ validUntil: "2020-01-01" })).join(" ")).toMatch(/validade/i);
    expect(quotationWarnings(cotacao({ courses: [] })).join(" ")).toMatch(/nenhum curso/i);
  });
});

describe("data de término estimada", () => {
  it.each([
    ["2026-11-30", "24 semanas", "2027-05-17"],
    ["2027-05-01", "2 anos", "2029-05-01"],
    ["2026-01-15", "6 meses", "2026-07-15"],
  ])("de %s por %s termina em %s", (inicio, duracao, esperado) => {
    expect(estimateEndDate(inicio, duracao)).toBe(esperado);
  });

  it("não inventa data quando não entende a duração", () => {
    expect(estimateEndDate("2026-01-01", "a combinar")).toBeUndefined();
    expect(estimateEndDate("data ruim", "2 anos")).toBeUndefined();
  });
});

describe("numeração", () => {
  it("usa quatro dígitos", () => {
    expect(formatQuotationNumber(1)).toBe("HA-0001");
    expect(formatQuotationNumber(1234)).toBe("HA-1234");
  });
});

describe("leitura do PDF", () => {
  // Formato típico de cotação de escola: bloco por curso, taxas em tabela
  const pdf = `
    QUOTATION
    Student: Angelo Calderan
    ENGLISH UNLIMITED
    General English
    24 weeks
    Start date 30/11/2026
    Tuition Fee              AUD 5,280.00
    Material Fee             AUD 300.00
    Loyalty discount         AUD 100.00

    Waratah Polytechnic
    Cert III Joinery
    2 years
    Start date 01/05/2027
    Tuition Fee              AUD 19,000.00
    Enrolment Fee            AUD 250.00

    Student Visa             AUD 2,500.00
    OSHC Single              AUD 1,945.00
  `;
  const r = parseQuotationText(pdf);

  it("separa um bloco por curso", () => {
    expect(r.courses).toHaveLength(2);
    expect(r.courses[0].course).toBe("General English");
    expect(r.courses[0].school).toBe("ENGLISH UNLIMITED");
  });

  it("lê as taxas e trata desconto como negativo", () => {
    expect(courseTotal(r.courses[0])).toBe(5480);  // 5280 + 300 - 100
    expect(courseTotal(r.courses[1])).toBe(19250);
  });

  it("lê data de início e duração", () => {
    expect(r.courses[0].startDate).toBe("2026-11-30");
    expect(r.courses[0].durationLabel).toMatch(/24 weeks/i);
    expect(r.courses[1].startDate).toBe("2027-05-01");
  });

  it("lê os custos de visto", () => {
    const labels = r.visaCosts.map((v) => v.label);
    expect(labels).toContain("Taxa do visto de estudante");
    expect(labels).toContain("OSHC (seguro saúde)");
    expect(r.visaCosts.reduce((s, v) => s + v.amount, 0)).toBe(4445);
  });

  it("sempre manda conferir entrada e parcelas, que o PDF não traz", () => {
    expect(r.unresolved.join(" ")).toMatch(/entrada e o plano de parcelas/i);
    expect(r.courses.every((c) => c.deposit === 0)).toBe(true);
  });

  it("não confunde número de duração com dinheiro", () => {
    // "24 weeks" não pode virar uma taxa de AUD 24
    expect(r.courses[0].fees.every((f) => f.amount !== 24)).toBe(true);
  });

  it("avisa quando o PDF não tem texto, em vez de devolver vazio em silêncio", () => {
    const vazio = parseQuotationText("   \n  \n ");
    expect(vazio.courses).toHaveLength(0);
    expect(vazio.unresolved.join(" ")).toMatch(/escaneado/i);
  });

  it("não inventa curso quando não reconhece nada", () => {
    const ruido = parseQuotationText("Documento sem nada de útil\nOutra linha qualquer");
    expect(ruido.courses).toHaveLength(0);
    expect(ruido.unresolved.join(" ")).toMatch(/nenhum curso reconhecido/i);
  });
});
