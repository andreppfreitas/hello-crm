export type LeadTemperature = "hot" | "warm" | "cold";

export type PipelineStage =
  | "new_lead"
  | "first_contact"
  | "waiting_response"
  | "meeting_scheduled"
  | "quotation_prepared"
  | "followup"
  | "student_said_yes"
  | "application_sent"
  | "offer_letter_received"
  | "contract_sent"
  | "documents_signed"
  | "read_carefully_email"
  | "first_payment"
  | "school_deposit"
  | "oshc_payment"
  | "oshc_policy"
  | "visa_payment"
  | "visa_checklist_call"
  | "statement_reviewed"
  | "final_doc_check"
  | "visa_applied"
  | "final_instructions"
  | "closed_won"
  | "closed_lost";

export type PhaseGroup =
  | "leads"
  | "qualifying"
  | "proposal"
  | "enrollment"
  | "payments"
  | "visa"
  | "closed";

export type CourseType =
  | "ELICOS"
  | "VET"
  | "Bachelor"
  | "Master"
  | "Foundation"
  | "Professional Year"
  | "Short Course"
  | "Other";

export type LeadSource =
  | "Facebook Group"
  | "Instagram"
  | "Referral"
  | "Website"
  | "WhatsApp"
  | "Walk-in"
  | "Event"
  | "LinkedIn"
  | "Other";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  completedAt?: string;
  comment?: string;
  stage: PipelineStage;
}

export interface Note {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  type: "note" | "call" | "email" | "whatsapp" | "meeting";
}

export interface ContactEvent {
  id: string;
  type: "call" | "email" | "whatsapp" | "meeting" | "note";
  summary: string;
  authorName: string;
  date: string;
}

export interface Payment {
  id: string;
  label: string;
  amount: number;
  currency: string;
  status: "pending" | "collected" | "overdue";
  dueDate?: string;
  paidAt?: string;
  notes?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Lead {
  id: string;
  // Personal
  fullName: string;
  phone: string;
  email: string;
  country: string;
  currentLocation: string;
  // Course
  courseInterest: CourseType | string;
  preferredCity: string;
  budget: string;
  // CRM
  source: LeadSource | string;
  temperature: LeadTemperature;
  stage: PipelineStage;
  assignedConsultant: string;
  notes: string;
  // Relations
  tasks: Task[];
  contactHistory: ContactEvent[];
  payments: Payment[];
  documents: Document[];
  notesList: Note[];
  stageHistory: StageHistoryEntry[];
  stageChanges: StageChangeEvent[];
  visaChecklist: VisaChecklistItem[];
  score?: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastContactAt?: string;
}

export interface StageHistoryEntry {
  stage: PipelineStage;
  enteredAt: string;
  exitedAt?: string;
}

export interface VisaChecklistItem {
  id: string;
  label: string;
  category: "identity" | "enrollment" | "financial" | "health" | "other";
  status: "pending" | "received" | "submitted";
  notes?: string;
}

export interface StageChangeEvent {
  id: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  changedAt: string;
  changedBy: string;
}

export interface Reminder {
  id: string;
  leadId: string;
  leadName: string;
  type: "call" | "whatsapp" | "email" | "meeting" | "other";
  note: string;
  dueAt: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  authorName: string;
}

export interface DashboardStats {
  total: number;
  hot: number;
  waitingReply: number;
  meetingsScheduled: number;
  applicationsInProgress: number;
  paymentsPending: number;
  visaPending: number;
  closedWon: number;
  closedLost: number;
}
