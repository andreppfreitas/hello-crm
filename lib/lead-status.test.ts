import { describe, it, expect } from "vitest";
import type { Lead } from "@/types";
import { isVisaExpired } from "./lead-status";

const NOW = new Date("2026-08-14T12:00:00Z").getTime();
const dias = (n: number) => new Date(NOW + n * 86400000).toISOString().slice(0, 10);

const lead = (over: Partial<Lead>): Lead => ({
  id: "x", fullName: "Aluno", phone: "", email: "", country: "Brazil",
  source: "Instagram", temperature: "warm", stage: "followup",
  assignedConsultant: "André", notes: "",
  tasks: [], contactHistory: [], payments: [], documents: [], notesList: [],
  stageHistory: [], stageChanges: [], visaChecklist: [],
  createdAt: dias(-90), updatedAt: dias(-1),
  ...over,
} as Lead);

describe("isVisaExpired", () => {
  it("marca quem já passou da data", () => {
    expect(isVisaExpired(lead({ visaExpiryDate: dias(-1) }), NOW)).toBe(true);
    expect(isVisaExpired(lead({ visaExpiryDate: dias(-400) }), NOW)).toBe(true);
  });

  it("não marca quem ainda está em dia, nem no limite", () => {
    expect(isVisaExpired(lead({ visaExpiryDate: dias(1) }), NOW)).toBe(false);
    expect(isVisaExpired(lead({ visaExpiryDate: dias(365) }), NOW)).toBe(false);
  });

  it("não marca quem não tem data preenchida", () => {
    expect(isVisaExpired(lead({}), NOW)).toBe(false);
    expect(isVisaExpired(lead({ visaExpiryDate: "" }), NOW)).toBe(false);
  });

  it("não marca offshore, mesmo com data antiga", () => {
    // Quem está fora da Austrália não tem visto correndo — data velha aí é
    // dado desatualizado, não situação irregular.
    expect(isVisaExpired(lead({ visaExpiryDate: dias(-30), isOffshore: true }), NOW)).toBe(false);
  });

  it("não quebra com data inválida", () => {
    expect(isVisaExpired(lead({ visaExpiryDate: "não sei" }), NOW)).toBe(false);
  });
});
