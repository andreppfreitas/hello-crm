/**
 * Pure lead construction helpers — no side-effects, safe to import anywhere.
 */
import type { Lead, Task, Note, ContactEvent, Payment, StageHistoryEntry } from "@/types";
import type { PipelineStage } from "@/types";
import { buildVisaChecklist } from "./visa-defaults";
import { CONSULTANTS, STAGE_CONFIG, TASK_TEMPLATES } from "./constants";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildTasksForStage(stage: PipelineStage, leadId: string): Task[] {
  const templates = TASK_TEMPLATES[stage] ?? [];
  return templates.map((title, i) => ({
    id: `${leadId}-task-${i}`,
    title,
    completed: Math.random() > 0.5,
    dueDate: Math.random() > 0.4 ? daysFromNow(Math.floor(Math.random() * 14) - 3) : undefined,
    stage,
  }));
}

export function buildNewLead(
  data: Omit<Lead, "id" | "createdAt" | "updatedAt" | "tasks" | "contactHistory" | "payments" | "documents" | "notesList" | "stageHistory">,
  idOverride?: string
): Lead {
  const id = idOverride ?? `lead-${uid()}`;
  return {
    ...data,
    id,
    tasks: [],
    contactHistory: [],
    payments: [],
    documents: [],
    notesList: [],
    stageHistory: [{ stage: data.stage, enteredAt: new Date().toISOString() }],
    stageChanges: [],
    visaChecklist: buildVisaChecklist(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Seed data generation ──────────────────────────────────────────────────────

const FIRST_NAMES = ["Gabriel", "Lucas", "Mateus", "Pedro", "Rafael", "Bruno", "Thiago", "Felipe",
  "Ana", "Beatriz", "Carolina", "Daniela", "Fernanda", "Isabela", "Julia", "Larissa",
  "Mariana", "Natalia", "Priscila", "Amanda", "Diego", "Eduardo", "Gustavo", "Henrique"];

const LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Costa", "Ferreira", "Lima", "Carvalho",
  "Alves", "Rodrigues", "Martins", "Pereira", "Barbosa", "Ribeiro", "Mendes", "Nascimento"];

const COUNTRIES = ["Brazil", "Colombia", "Argentina", "Chile", "Peru", "Mexico", "Ecuador", "Bolivia"];
const LOCATIONS = ["São Paulo, Brazil", "Rio de Janeiro, Brazil", "Belo Horizonte, Brazil",
  "Bogotá, Colombia", "Buenos Aires, Argentina", "Santiago, Chile", "Lima, Peru"];
const COURSES = ["ELICOS - General English", "ELICOS - IELTS Prep", "VET - Hospitality", "VET - Business",
  "Bachelor of Business", "Bachelor of IT", "Master of Business Administration", "Foundation Studies",
  "Professional Year - IT", "Professional Year - Accounting"];
const CITIES = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast"];
const SOURCES = ["Instagram", "Facebook", "Referral", "Website", "WhatsApp", "Google", "TikTok", "Indication"];
const BUDGETS = ["Under AUD 5,000", "AUD 5,000–10,000", "AUD 10,000–20,000", "AUD 20,000–40,000", "Over AUD 40,000"];
const ALL_STAGES = Object.keys(STAGE_CONFIG) as PipelineStage[];

function seedContactHistory(leadId: string): ContactEvent[] {
  const types: ContactEvent["type"][] = ["call", "email", "whatsapp", "meeting"];
  const summaries = ["Initial contact via WhatsApp", "Call to discuss course options",
    "Email with course brochure", "Meeting to review quotation", "Follow-up call about visa"];
  return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
    id: `${leadId}-c-${i}`,
    type: pick(types),
    summary: pick(summaries),
    authorName: pick(CONSULTANTS),
    date: daysAgo(Math.floor(Math.random() * 30)),
  }));
}

function seedNotes(leadId: string): Note[] {
  const contents = ["Student interested in ELICOS. Plans to start in 3 months.",
    "Confirmed budget AUD 8k. Prefers Sydney.", "Course options sent via WhatsApp.",
    "Meeting went well. Questions about visa.", "Ready to proceed. Collecting documents."];
  const types: Note["type"][] = ["note", "call", "email", "whatsapp", "meeting"];
  return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
    id: `${leadId}-n-${i}`,
    content: pick(contents),
    authorName: pick(CONSULTANTS),
    createdAt: daysAgo(Math.floor(Math.random() * 30)),
    type: pick(types),
  }));
}

function seedPayments(leadId: string, stage: PipelineStage): Payment[] {
  const order = STAGE_CONFIG[stage].order;
  const payments: Payment[] = [];
  if (order >= 13) payments.push({ id: `${leadId}-p1`, label: "CoE First Payment", amount: 1500, currency: "AUD", status: order >= 14 ? "collected" : "pending", dueDate: daysFromNow(-2), paidAt: order >= 14 ? daysAgo(5) : undefined });
  if (order >= 14) payments.push({ id: `${leadId}-p2`, label: "School Deposit", amount: 3000, currency: "AUD", status: order >= 15 ? "collected" : "pending", dueDate: daysFromNow(3) });
  if (order >= 15) payments.push({ id: `${leadId}-p3`, label: "OSHC", amount: 620, currency: "AUD", status: order >= 16 ? "collected" : "pending", dueDate: daysFromNow(5) });
  if (order >= 17) payments.push({ id: `${leadId}-p4`, label: "Visa Application", amount: 715, currency: "AUD", status: order >= 21 ? "collected" : "pending", dueDate: daysFromNow(7) });
  return payments;
}

function seedStageHistory(stage: PipelineStage, createdDaysAgo: number): StageHistoryEntry[] {
  const order = STAGE_CONFIG[stage].order;
  const history: StageHistoryEntry[] = [];
  let cursor = createdDaysAgo;
  for (let o = 1; o <= order; o++) {
    const s = ALL_STAGES.find((st) => STAGE_CONFIG[st].order === o)!;
    const days = Math.floor(Math.random() * 8) + 1;
    const enteredAt = daysAgo(cursor);
    cursor -= days;
    history.push({ stage: s, enteredAt, exitedAt: o < order ? daysAgo(cursor) : undefined });
  }
  return history;
}

export function generateSeedLeads(count = 50): Lead[] {
  return Array.from({ length: count }, (_, i) => {
    const id = `lead-${String(i + 1).padStart(3, "0")}`;
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const stage = pick(ALL_STAGES);
    const createdDaysAgo = Math.floor(Math.random() * 120);

    return {
      id,
      fullName: `${firstName} ${lastName}`,
      phone: `+55 11 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      country: pick(COUNTRIES),
      currentLocation: pick(LOCATIONS),
      courseInterest: pick(COURSES),
      preferredCity: pick(CITIES),
      budget: pick(BUDGETS),
      source: pick(SOURCES) as Lead["source"],
      temperature: pick(["hot", "warm", "cold"] as const),
      stage,
      assignedConsultant: pick(CONSULTANTS),
      notes: "",
      tasks: buildTasksForStage(stage, id),
      contactHistory: seedContactHistory(id),
      payments: seedPayments(id, stage),
      documents: [],
      notesList: seedNotes(id),
      stageHistory: seedStageHistory(stage, createdDaysAgo),
      stageChanges: [],
      visaChecklist: buildVisaChecklist(),
      createdAt: daysAgo(createdDaysAgo),
      updatedAt: daysAgo(Math.floor(Math.random() * createdDaysAgo || 1)),
      lastContactAt: daysAgo(Math.floor(Math.random() * 14)),
    } satisfies Lead;
  });
}
