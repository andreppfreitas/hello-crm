import type { Lead, Task, Note, ContactEvent, Payment, Reminder, StageHistoryEntry, StageChangeEvent } from "@/types";
import { buildVisaChecklist } from "./visa-defaults";
import { CONSULTANTS as CONS } from "./constants";
import { CONSULTANTS, COURSES, CITIES, SOURCES, STAGE_CONFIG, TASK_TEMPLATES } from "./constants";
import type { PipelineStage } from "@/types";

const ALL_STAGES = Object.keys(STAGE_CONFIG) as PipelineStage[];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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

const FIRST_NAMES = ["Gabriel", "Lucas", "Mateus", "Pedro", "Rafael", "Bruno", "Thiago", "Felipe",
  "Ana", "Beatriz", "Carolina", "Daniela", "Fernanda", "Isabela", "Julia", "Larissa",
  "Mariana", "Natalia", "Priscila", "Amanda", "Diego", "Eduardo", "Gustavo", "Henrique"];

const LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Costa", "Ferreira", "Lima", "Carvalho",
  "Alves", "Rodrigues", "Martins", "Pereira", "Barbosa", "Ribeiro", "Mendes", "Nascimento"];

const COUNTRIES = ["Brazil", "Colombia", "Argentina", "Chile", "Peru", "Mexico", "Ecuador", "Bolivia"];

const CURRENT_LOCATIONS = ["São Paulo, Brazil", "Rio de Janeiro, Brazil", "Belo Horizonte, Brazil",
  "Bogotá, Colombia", "Buenos Aires, Argentina", "Santiago, Chile", "Lima, Peru", "Mexico City, Mexico",
  "Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia"];

function generateTasks(stage: PipelineStage, leadId: string): Task[] {
  const templates = TASK_TEMPLATES[stage] ?? [];
  return templates.map((title, i) => ({
    id: `${leadId}-task-${i}`,
    title,
    completed: Math.random() > 0.5,
    dueDate: Math.random() > 0.4 ? daysFromNow(Math.floor(Math.random() * 14) - 3) : undefined,
    stage,
  }));
}

function generateNotes(leadId: string, count = 2): Note[] {
  const types: Note["type"][] = ["note", "call", "email", "whatsapp", "meeting"];
  const contents = [
    "Student is very interested in ELICOS program. Plans to start within 3 months.",
    "Called today, student confirmed budget of AUD 8,000. Prefers Sydney.",
    "Sent course options via WhatsApp. Waiting for response.",
    "Meeting went well. Student has questions about visa requirements.",
    "Email follow-up sent. Attached course brochure.",
    "Student confirmed they are ready to proceed. Collecting documents.",
    "Payment discussion went smoothly. Student agrees to payment plan.",
    "Visa checklist completed. All documents look good.",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `${leadId}-note-${i}`,
    content: pick(contents),
    authorName: pick(CONSULTANTS),
    createdAt: daysAgo(Math.floor(Math.random() * 30)),
    type: pick(types),
  }));
}

function generateContactHistory(leadId: string, count = 2): ContactEvent[] {
  const types: ContactEvent["type"][] = ["call", "email", "whatsapp", "meeting"];
  const summaries = [
    "Initial contact made via WhatsApp",
    "Phone call to discuss course options",
    "Email with course brochure sent",
    "Meeting to review quotation",
    "Follow-up call about visa requirements",
    "WhatsApp message confirming documents",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `${leadId}-contact-${i}`,
    type: pick(types),
    summary: pick(summaries),
    authorName: pick(CONSULTANTS),
    date: daysAgo(Math.floor(Math.random() * 30)),
  }));
}

function generatePayments(leadId: string, stage: PipelineStage): Payment[] {
  const stageOrder = STAGE_CONFIG[stage].order;
  const payments: Payment[] = [];
  if (stageOrder >= 13) {
    payments.push({
      id: `${leadId}-pay-1`,
      label: "CoE First Payment",
      amount: 1500,
      currency: "AUD",
      status: stageOrder >= 14 ? "collected" : "pending",
      dueDate: daysFromNow(-2),
      paidAt: stageOrder >= 14 ? daysAgo(5) : undefined,
    });
  }
  if (stageOrder >= 14) {
    payments.push({
      id: `${leadId}-pay-2`,
      label: "School Deposit",
      amount: 3000,
      currency: "AUD",
      status: stageOrder >= 15 ? "collected" : "pending",
      dueDate: daysFromNow(3),
    });
  }
  if (stageOrder >= 15) {
    payments.push({
      id: `${leadId}-pay-3`,
      label: "OSHC",
      amount: 620,
      currency: "AUD",
      status: stageOrder >= 16 ? "collected" : "pending",
      dueDate: daysFromNow(5),
    });
  }
  if (stageOrder >= 17) {
    payments.push({
      id: `${leadId}-pay-4`,
      label: "Visa Application",
      amount: 715,
      currency: "AUD",
      status: stageOrder >= 21 ? "collected" : "pending",
      dueDate: daysFromNow(7),
    });
  }
  return payments;
}

function generateStageHistory(stage: PipelineStage, createdDaysAgo: number): StageHistoryEntry[] {
  const stageOrder = STAGE_CONFIG[stage].order;
  const history: StageHistoryEntry[] = [];
  let daysCursor = createdDaysAgo;
  for (let o = 1; o <= stageOrder; o++) {
    const s = ALL_STAGES.find((st) => STAGE_CONFIG[st].order === o)!;
    const daysInStage = Math.floor(Math.random() * 8) + 1;
    const enteredAt = daysAgo(daysCursor);
    daysCursor -= daysInStage;
    history.push({ stage: s, enteredAt, exitedAt: o < stageOrder ? daysAgo(daysCursor) : undefined });
  }
  return history;
}

function generateLead(i: number): Lead {
  const id = `lead-${String(i).padStart(3, "0")}`;
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
    currentLocation: pick(CURRENT_LOCATIONS),
    courseInterest: pick(COURSES),
    preferredCity: pick(CITIES),
    budget: pick(["Under AUD 5,000", "AUD 5,000–10,000", "AUD 10,000–20,000", "AUD 20,000–40,000", "Over AUD 40,000"]),
    source: pick(SOURCES) as Lead["source"],
    temperature: pick(["hot", "warm", "cold"] as const),
    stage,
    assignedConsultant: pick(CONSULTANTS),
    notes: "",
    tasks: generateTasks(stage, id),
    contactHistory: generateContactHistory(id, Math.floor(Math.random() * 4) + 1),
    payments: generatePayments(id, stage),
    documents: [],
    notesList: generateNotes(id, Math.floor(Math.random() * 3) + 1),
    stageHistory: generateStageHistory(stage, createdDaysAgo),
    stageChanges: [],
    visaChecklist: buildVisaChecklist(),
    createdAt: daysAgo(createdDaysAgo),
    updatedAt: daysAgo(Math.floor(Math.random() * createdDaysAgo)),
    lastContactAt: daysAgo(Math.floor(Math.random() * 14)),
  };
}

let _leads: Lead[] = Array.from({ length: 50 }, (_, i) => generateLead(i + 1));

export function getMockLeads(): Lead[] {
  return [..._leads];
}

export function getMockLead(id: string): Lead | undefined {
  return _leads.find((l) => l.id === id);
}

export function createMockLead(data: Omit<Lead, "id" | "createdAt" | "updatedAt" | "tasks" | "contactHistory" | "payments" | "documents" | "notesList" | "stageHistory">): Lead {
  const id = `lead-${uid()}`;
  const lead: Lead = {
    ...data,
    id,
    tasks: generateTasks(data.stage, id),
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
  _leads = [lead, ..._leads];
  return lead;
}

export function updateMockLead(id: string, data: Partial<Lead>, changedBy?: string): Lead | undefined {
  _leads = _leads.map((l) => {
    if (l.id !== id) return l;
    const updated = { ...l, ...data, updatedAt: new Date().toISOString() };

    // Track stage changes
    if (data.stage && data.stage !== l.stage) {
      const now = new Date().toISOString();
      const change: StageChangeEvent = {
        id: `sc-${Date.now()}`,
        fromStage: l.stage,
        toStage: data.stage,
        changedAt: now,
        changedBy: changedBy ?? CONS[0],
      };
      updated.stageChanges = [change, ...(l.stageChanges ?? [])];
      updated.stageHistory = l.stageHistory.map((h) =>
        h.stage === l.stage && !h.exitedAt ? { ...h, exitedAt: now } : h
      );
      updated.stageHistory = [...updated.stageHistory, { stage: data.stage, enteredAt: now }];
    }
    return updated;
  });
  return _leads.find((l) => l.id === id);
}

export function deleteMockLead(id: string): void {
  _leads = _leads.filter((l) => l.id !== id);
}

// ── Reminders ──────────────────────────────────────────────────────────────

let _reminders: Reminder[] = [];

export function getMockReminders(): Reminder[] {
  return [..._reminders];
}

export function createMockReminder(data: Omit<Reminder, "id" | "createdAt" | "completed">): Reminder {
  const reminder: Reminder = {
    ...data,
    id: `rem-${uid()}`,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  _reminders = [reminder, ..._reminders];
  return reminder;
}

export function completeMockReminder(id: string): void {
  _reminders = _reminders.map((r) =>
    r.id === id ? { ...r, completed: true, completedAt: new Date().toISOString() } : r
  );
}

export function deleteMockReminder(id: string): void {
  _reminders = _reminders.filter((r) => r.id !== id);
}

export function getMockDashboardStats() {
  const leads = getMockLeads();
  return {
    total: leads.length,
    hot: leads.filter((l) => l.temperature === "hot").length,
    waitingReply: leads.filter((l) => l.stage === "initial_docs_requested").length,
    meetingsScheduled: leads.filter((l) => l.stage === "meeting_scheduled").length,
    applicationsInProgress: leads.filter((l) => STAGE_CONFIG[l.stage].order >= 8 && STAGE_CONFIG[l.stage].order <= 12).length,
    paymentsPending: leads.filter((l) => l.payments.some((p) => p.status === "pending")).length,
    visaPending: leads.filter((l) => ["visa_lodged", "medical_requested", "visa_granted"].includes(l.stage)).length,
  };
}
