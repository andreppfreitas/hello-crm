export type LeadTemperature = "hot" | "warm" | "cold";

export type PipelineStage =
  // Leads
  | "new_lead"
  | "first_contact"
  // Qualifying
  | "initial_docs_requested"
  | "initial_docs_received"
  | "meeting_scheduled"
  | "quotation_prepared"
  // Proposal
  | "followup"
  | "student_approved_quotation"
  // Enrollment
  | "application_sent"
  | "school_requested_docs"
  | "offer_letter_received"
  | "final_quote_sent"
  | "contract_sent"
  | "read_carefully_email"
  // Documents
  | "documents_signed"
  | "visa_checklist_sent"
  | "student_uploading_docs"
  | "gs_letter_draft_sent"
  | "gs_letter_approved"
  | "documents_complete"
  // Payments
  | "coe_deposit_paid"
  | "coe_issued"
  | "coe_confirmed"
  | "oshc_payment"
  | "oshc_issued"
  | "visa_fee_paid"
  // Visa
  | "visa_lodged"
  | "medical_requested"
  | "visa_granted"
  // Closed
  | "closed_won"
  | "closed_lost";

export type PhaseGroup =
  | "leads"
  | "qualifying"
  | "proposal"
  | "enrollment"
  | "documents"
  | "payments"
  | "visa"
  | "closed";

export type NextAction =
  | "call_student"
  | "whatsapp_student"
  | "email_student"
  | "schedule_meeting"
  | "apply_to_school"
  | "review_documents"
  | "notify_visa_team"
  | "send_visa_checklist"
  | "request_coe_deposit"
  | "collect_oshc_payment"
  | "collect_visa_fee"
  | "lodge_visa"
  | "notify_student"
  | null;

export type WaitingFor =
  | "student"
  | "school"
  | "visa_team"
  | "payment"
  | "insurance_provider"
  | "home_affairs"
  | null;

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

export interface StageChecklistItem {
  id: string;
  label: string;
  done: boolean;
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
  // Next action / waiting
  nextAction?: NextAction;
  waitingFor?: WaitingFor;
  stageChecklist?: StageChecklistItem[];
  // Multi-stage: additional stages completed within the same phase
  completedStages?: PipelineStage[];
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
  // Visa / offshore status
  currentVisaType?: string;
  visaExpiryDate?: string;      // ISO date string YYYY-MM-DD
  isOffshore?: boolean;         // currently outside home country (e.g. already in Australia)
  // Group (casal / família)
  groupId?: string;
  groupType?: "couple" | "family";
  groupRole?: "primary" | "member";
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

export interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action:
    | "lead_created"
    | "lead_deleted"
    | "stage_changed"
    | "note_added"
    | "temperature_changed"
    | "consultant_changed"
    | "lead_updated";
  leadId: string;
  leadName: string;
  details?: string; // e.g. "New Lead → Waiting Response"
  timestamp: string;
}

export interface CustomTemplate {
  id: string;
  label: string;
  channel: "whatsapp" | "email";
  subject?: string;
  body: string;
  createdAt: string;
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
