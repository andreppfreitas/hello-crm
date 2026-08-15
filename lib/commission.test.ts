import { describe, it, expect } from "vitest";
import type { Lead } from "@/types";
import {
  parseMoney, enrollmentCommission, billableEnrollments,
  revenueSummary, revenueBySchool, revenueByMonth,
} from "./commission";

const lead = (over: Partial<Lead>): Lead => ({
  id: "x", fullName: "Aluno", phone: "", email: "", country: "Brazil",
  source: "Instagram", temperature: "warm", stage: "new_lead",
  assignedConsultant: "André", notes: "",
  tasks: [], contactHistory: [], payments: [], documents: [], notesList: [],
  stageHistory: [], stageChanges: [], visaChecklist: [],
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
} as Lead);

describe("parseMoney", () => {
  // O tuition é texto livre e os formatos BR e AU são invertidos entre si —
  // é o ponto mais fácil de errar em toda a camada de receita.
  it.each([
    ["AUD 12,500", 12500],
    ["12.500,00", 12500],      // brasileiro
    ["$12,500.00", 12500],     // australiano
    ["12500", 12500],
    ["1.234.567", 1234567],
    ["1,234,567", 1234567],
    ["12,50", 12.5],           // 2 casas = decimal
    ["12.5", 12.5],
    ["R$ 8.000", 8000],
    ["0", 0],
  ])("lê %s como %d", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(["", "   ", "a combinar", "sob consulta"])("devolve null para %o", (input) => {
    expect(parseMoney(input)).toBeNull();
  });

  it("devolve null, nunca 0, quando não há valor", () => {
    // 0 significaria "de graça"; null significa "não preenchido"
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney(null)).toBeNull();
  });
});

describe("enrollmentCommission", () => {
  it("multiplica tuition pela taxa", () => {
    expect(enrollmentCommission({ id: "1", course: "c", school: "s", tuitionFee: "AUD 12,500", commissionRate: 25 })).toBe(3125);
  });

  it("devolve null quando falta a taxa ou o valor", () => {
    expect(enrollmentCommission({ id: "1", course: "c", school: "s", tuitionFee: "12500" })).toBeNull();
    expect(enrollmentCommission({ id: "1", course: "c", school: "s", commissionRate: 25 })).toBeNull();
  });
});

describe("billableEnrollments", () => {
  it("conta a opção única sem precisar marcar", () => {
    const l = lead({ enrollments: [{ id: "1", course: "ELICOS", school: "APC" }] });
    expect(billableEnrollments(l)).toHaveLength(1);
  });

  it("não fatura nada quando há várias opções e nenhuma foi escolhida", () => {
    const l = lead({ enrollments: [
      { id: "1", course: "A", school: "X" },
      { id: "2", course: "B", school: "Y" },
    ]});
    expect(billableEnrollments(l)).toHaveLength(0);
  });

  it("respeita a opção marcada como fechada", () => {
    const l = lead({ enrollments: [
      { id: "1", course: "A", school: "X" },
      { id: "2", course: "B", school: "Y", confirmed: true },
    ]});
    expect(billableEnrollments(l).map((e) => e.id)).toEqual(["2"]);
  });

  it("ignora enrollment em branco", () => {
    expect(billableEnrollments(lead({ enrollments: [{ id: "1", course: "  ", school: "" }] }))).toHaveLength(0);
    expect(billableEnrollments(lead({}))).toHaveLength(0);
  });
});

describe("revenueSummary", () => {
  const leads = [
    lead({ id: "1", stage: "visa_granted", temperature: "closed",
      enrollments: [{ id: "e1", course: "A", school: "APC", tuitionFee: "10000", commissionRate: 20, commissionStatus: "received" }] }),
    lead({ id: "2", stage: "coe_issued",
      enrollments: [{ id: "e2", course: "B", school: "ILSC", tuitionFee: "10000", commissionRate: 20, commissionStatus: "invoiced" }] }),
    lead({ id: "3", stage: "coe_issued",
      enrollments: [{ id: "e3", course: "C", school: "ILSC", tuitionFee: "10000", commissionRate: 20 }] }),
    lead({ id: "4", stage: "followup",
      enrollments: [{ id: "e4", course: "D", school: "Kaplan", tuitionFee: "10000", commissionRate: 20 }] }),
    lead({ id: "5", stage: "new_lead", enrollments: [{ id: "e5", course: "E", school: "X" }] }),
  ];
  const s = revenueSummary(leads);

  it("separa recebido, faturado e a faturar", () => {
    expect(s.received).toBe(2000);
    expect(s.invoiced).toBe(2000);
    expect(s.pendingClosed).toBe(2000);
  });

  it("pondera o pipeline pela probabilidade da fase", () => {
    expect(s.totalPipeline).toBe(2000);
    expect(s.forecast).toBe(600); // proposal = 30%
  });

  it("aponta quem tem curso fechado sem dado de comissão", () => {
    expect(s.leadsMissingData).toBe(1);
  });
});

describe("agregações", () => {
  const leads = [
    lead({ id: "1", stage: "visa_granted",
      enrollments: [{ id: "e1", course: "A", school: "APC", tuitionFee: "10000", commissionRate: 20, commissionStatus: "received", courseStartDate: "2026-02-02" }] }),
    lead({ id: "2", stage: "coe_issued",
      enrollments: [{ id: "e2", course: "B", school: "APC", tuitionFee: "20000", commissionRate: 10, courseStartDate: "2026-07-06" }] }),
  ];

  it("soma por escola e sabe quanto já entrou", () => {
    const [apc] = revenueBySchool(leads);
    expect(apc).toMatchObject({ school: "APC", students: 2, tuition: 30000, commission: 4000, received: 2000 });
  });

  it("agrupa pelo mês de início do curso, em ordem", () => {
    expect(revenueByMonth(leads).map((m) => m.month)).toEqual(["2026-02", "2026-07"]);
  });

  it("ignora curso sem data de início", () => {
    const semData = [lead({ id: "3", enrollments: [{ id: "e3", course: "C", school: "Y", tuitionFee: "5000", commissionRate: 20 }] })];
    expect(revenueByMonth(semData)).toHaveLength(0);
  });
});
