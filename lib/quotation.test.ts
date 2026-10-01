import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Quotation, QuotationCourse, CostGroup } from "@/types/quotation";
import {
  courseTotal, groupTotal, scheduleTotal, sortedSchedule, computeTotals,
  quotationWarnings, estimateEndDate, formatQuotationNumber, fmt,
} from "./quotation";
import { parseQuotationText, parseEnrolDate } from "./quotation-parser";

/** Texto extraído de um PDF real do 1Enrol (Greenwich, Cert IV Kitchen Management). */
const PDF_REAL = readFileSync(join(__dirname, "__fixtures__/1enrol-greenwich.txt"), "utf8");

const curso = (over: Partial<QuotationCourse> = {}): QuotationCourse => ({
  id: "c1", school: "Greenwich", course: "Cert IV", durationLabel: "88 semanas",
  startDate: "2026-08-24", fees: [{ label: "Valor do Curso", amount: 17575 }], ...over,
});

const grupo = (over: Partial<CostGroup> = {}): CostGroup => ({
  id: "g1", title: "Visto", lines: [{ label: "Student visa", amount: 2500 }], ...over,
});

const cotacao = (over: Partial<Quotation> = {}): Quotation => ({
  id: "q1", leadId: "l1", number: "HA-0001", packageName: "Pacote", city: "Sydney",
  currency: "AUD", courses: [curso()], costGroups: [grupo()], schedule: [],
  status: "draft", publicToken: "tok", createdBy: "André",
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", ...over,
});

// ─────────────────────────────────────────────────────────────────────────────

describe("leitura do PDF real do 1Enrol", () => {
  const r = parseQuotationText(PDF_REAL);

  it("não reporta nenhuma divergência contra os totais do próprio PDF", () => {
    // O parser confere o que leu contra "Total Curso:", "Total Visto:" etc.
    const divergencias = r.unresolved.filter((u) => /declara/i.test(u));
    expect(divergencias).toEqual([]);
  });

  it("lê os dados do aluno e da cotação", () => {
    expect(r.studentName).toBe("Felipe Monteiro Reginato Ferraz");
    expect(r.consultantName).toBe("Andre");
    expect(r.consultantEmail).toBe("sydney3@hellostudy.com");
    expect(r.branch).toBe("Sydney");
    expect(r.sourceNumber).toBe("226601");
    expect(r.issuedAt).toBe("2026-08-13");
  });

  it("lê o curso com escola, CRICOS, duração e as duas datas", () => {
    expect(r.courses).toHaveLength(1);
    const c = r.courses[0];
    expect(c.course).toBe("Certificate IV in Kitchen Management");
    expect(c.school).toBe("Greenwich English College");
    expect(c.cricos).toBe("02672K");
    expect(c.location).toBe("Sydney, New South Wales, Australia");
    expect(c.durationLabel).toBe("88 Semanas");
    expect(c.startDate).toBe("2026-08-24");
    expect(c.endDate).toBe("2028-04-28");
  });

  it("usa o TOTAL da linha, não o valor unitário", () => {
    // "Taxa de Matrícula 0 AUD 260.00 0.00" é isenta: vale 0, não 260
    const matricula = r.courses[0].fees.find((f) => /matr[íi]cula/i.test(f.label));
    expect(matricula?.amount).toBe(0);
    expect(courseTotal(r.courses[0])).toBe(19275); // igual a "Total Curso: AUD$19,275.00"
  });

  it("separa os três grupos de custo fora do curso", () => {
    expect(r.costGroups.map((g) => g.title)).toEqual(["Visto", "Outros", "Seguro Saúde"]);
    expect(r.costGroups.map(groupTotal)).toEqual([3244.8, 2000, 1328]);
  });

  it("não se perde com cifrão dentro do nome da taxa", () => {
    // "Credit card surcharge over Au$ 3,200.00 1 AUD 44.80 44.80"
    const visto = r.costGroups.find((g) => g.title === "Visto")!;
    const surcharge = visto.lines.find((l) => /surcharge/i.test(l.label));
    expect(surcharge?.amount).toBe(44.8);
    expect(surcharge?.label).toContain("3,200.00");
  });

  it("explica ao aluno o que é cada grupo", () => {
    for (const g of r.costGroups) {
      expect(g.explanation, `${g.title} sem explicação`).toBeTruthy();
    }
    expect(r.costGroups.find((g) => g.title === "Seguro Saúde")!.explanation).toMatch(/OSHC/);
  });

  it("lê as 13 parcelas com data, descrição e destinatário", () => {
    expect(r.schedule).toHaveLength(13);
    expect(r.schedule.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.dueDate))).toBe(true);

    const primeira = r.schedule[0];
    expect(primeira.dueDate).toBe("2026-08-15");
    expect(primeira.description).toBe("Material Fee");
    expect(primeira.payee).toBe("Greenwich English College");
    expect(primeira.amount).toBe(2625);

    const mensalidades = r.schedule.filter((p) => p.description === "Tuition Fee");
    expect(mensalidades).toHaveLength(9);
    expect(mensalidades.every((p) => p.amount === 1850)).toBe(true);
  });

  it("o cronograma fecha com o total da cotação", () => {
    // TOTAL AUD$25,847.80 no rodapé do PDF
    expect(scheduleTotal(r.schedule)).toBeCloseTo(25847.8, 2);
    const cursos = r.courses.reduce((s, c) => s + courseTotal(c), 0);
    const extras = r.costGroups.reduce((s, g) => s + groupTotal(g), 0);
    expect(cursos + extras).toBeCloseTo(25847.8, 2);
  });

  it("ignora o rodapé de câmbio e telefones", () => {
    const tudo = JSON.stringify(r);
    expect(tudo).not.toMatch(/C[âa]mbio|facebook|3786/);
  });
});

describe("totais de uma cotação lida do PDF real", () => {
  const r = parseQuotationText(PDF_REAL);
  const q = cotacao({ courses: r.courses, costGroups: r.costGroups, schedule: r.schedule });
  const t = computeTotals(q);

  it("soma cursos e extras", () => {
    expect(t.coursesTotal).toBe(19275);
    expect(t.extrasTotal).toBeCloseTo(6572.8, 2);
    expect(t.grandTotal).toBeCloseTo(25847.8, 2);
  });

  it("'quanto pago agora' é tudo que vence na primeira data", () => {
    // 15 Aug 2026: 2.625 + 3.244,80 + 2.000 + 1.328
    expect(t.upfrontDate).toBe("2026-08-15");
    expect(t.upfrontTotal).toBeCloseTo(9197.8, 2);
    expect(t.remainingTotal).toBeCloseTo(16650, 2); // 9 × 1.850
  });

  it("não acusa inconsistência numa cotação lida corretamente", () => {
    expect(quotationWarnings(q)).toEqual([]);
  });
});

describe("avisos antes de enviar ao aluno", () => {
  it("avisa quando o cronograma não fecha com a cotação", () => {
    const q = cotacao({ schedule: [{ id: "p1", dueDate: "2026-09-01", description: "Entrada", amount: 100 }] });
    expect(quotationWarnings(q).join(" ")).toMatch(/cronograma soma/i);
  });

  it("avisa parcela sem data, curso zerado, escola vazia e validade vencida", () => {
    expect(quotationWarnings(cotacao({
      schedule: [{ id: "p", dueDate: "", description: "x", amount: 20075 }],
    })).join(" ")).toMatch(/sem data/i);
    expect(quotationWarnings(cotacao({ courses: [curso({ fees: [] })] })).join(" ")).toMatch(/zerado/i);
    expect(quotationWarnings(cotacao({ courses: [curso({ school: "" })] })).join(" ")).toMatch(/escola/i);
    expect(quotationWarnings(cotacao({ validUntil: "2020-01-01" })).join(" ")).toMatch(/validade/i);
  });

  it("tolera arredondamento de até uma unidade", () => {
    const q = cotacao({ schedule: [{ id: "p", dueDate: "2026-09-01", description: "x", amount: 20075.4 }] });
    expect(quotationWarnings(q).filter((a) => /cronograma/.test(a))).toEqual([]);
  });
});

describe("datas e formatação", () => {
  it.each([
    ["24 Aug 2026", "2026-08-24"],
    ["28 Apr 2028", "2028-04-28"],
    ["13/08/2026", "2026-08-13"],
    ["2026-08-24", "2026-08-24"],
  ])("entende %s", (entrada, esperado) => {
    expect(parseEnrolDate(entrada)).toBe(esperado);
  });

  it("não inventa data quando não entende", () => {
    expect(parseEnrolDate("a combinar")).toBeUndefined();
    expect(parseEnrolDate("24 Xyz 2026")).toBeUndefined();
  });

  it("mostra a sigla da moeda, porque '$' é ambíguo para brasileiro", () => {
    expect(fmt(5580)).toBe("AUD 5,580.00");
    expect(fmt(-100)).toBe("-AUD 100.00");
  });

  it("ordena o cronograma por vencimento", () => {
    const fora = [
      { id: "b", dueDate: "2027-01-10", description: "x", amount: 1 },
      { id: "a", dueDate: "2026-08-15", description: "y", amount: 2 },
    ];
    expect(sortedSchedule(fora).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it.each([
    ["2026-11-30", "24 semanas", "2027-05-17"],
    ["2027-05-01", "2 anos", "2029-05-01"],
  ])("estima término de %s por %s", (ini, dur, esperado) => {
    expect(estimateEndDate(ini, dur)).toBe(esperado);
  });

  it("numera com quatro dígitos", () => {
    expect(formatQuotationNumber(42)).toBe("HA-0042");
  });
});

describe("entradas problemáticas", () => {
  it("avisa quando o PDF não tem texto, em vez de devolver vazio em silêncio", () => {
    const r = parseQuotationText("  \n \n ");
    expect(r.courses).toHaveLength(0);
    expect(r.unresolved.join(" ")).toMatch(/escaneado/i);
  });

  it("não inventa curso a partir de ruído", () => {
    const r = parseQuotationText("Documento qualquer\nsem nada de util aqui");
    expect(r.courses).toHaveLength(0);
    expect(r.unresolved.join(" ")).toMatch(/nenhum curso/i);
  });

  it("denuncia divergência quando o PDF declara um total diferente do que foi lido", () => {
    const adulterado = PDF_REAL.replace("Total Curso: AUD$19,275.00", "Total Curso: AUD$21,000.00");
    const r = parseQuotationText(adulterado);
    expect(r.unresolved.join(" ")).toMatch(/Curso.*declara/i);
  });
});
