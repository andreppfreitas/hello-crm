import type { PipelineStage, PhaseGroup, NextAction, WaitingFor } from "@/types";
import type { Reminder } from "@/types";

export const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; phase: PhaseGroup; color: string; bg: string; dot: string; order: number }
> = {
  // Leads
  new_lead:                  { label: "New Lead",                              phase: "leads",      color: "text-slate-300",    bg: "bg-slate-500/20 border-slate-500/30",    dot: "bg-slate-400",    order: 1 },
  first_contact:             { label: "First Contact",                         phase: "leads",      color: "text-blue-300",     bg: "bg-blue-500/20 border-blue-500/30",      dot: "bg-blue-400",     order: 2 },
  // Qualifying
  initial_docs_requested:    { label: "Initial Documents Requested",           phase: "qualifying", color: "text-cyan-300",     bg: "bg-cyan-500/20 border-cyan-500/30",      dot: "bg-cyan-400",     order: 3 },
  initial_docs_received:     { label: "Initial Documents Received",            phase: "qualifying", color: "text-sky-300",      bg: "bg-sky-500/20 border-sky-500/30",        dot: "bg-sky-400",      order: 4 },
  meeting_scheduled:         { label: "Meeting Scheduled",                     phase: "qualifying", color: "text-indigo-300",   bg: "bg-indigo-500/20 border-indigo-500/30",  dot: "bg-indigo-400",   order: 5 },
  quotation_prepared:        { label: "Quotation Prepared",                    phase: "qualifying", color: "text-violet-300",   bg: "bg-violet-500/20 border-violet-500/30",  dot: "bg-violet-400",   order: 6 },
  // Proposal
  followup:                  { label: "Follow-up",                             phase: "proposal",   color: "text-orange-300",   bg: "bg-orange-500/20 border-orange-500/30",  dot: "bg-orange-400",   order: 7 },
  student_approved_quotation:{ label: "Student Approved Quotation",            phase: "proposal",   color: "text-amber-300",    bg: "bg-amber-500/20 border-amber-500/30",    dot: "bg-amber-400",    order: 8 },
  // Enrollment
  application_sent:          { label: "Application Sent to School",            phase: "enrollment", color: "text-purple-300",   bg: "bg-purple-500/20 border-purple-500/30",  dot: "bg-purple-400",   order: 9 },
  school_requested_docs:     { label: "School Requested Documents",            phase: "enrollment", color: "text-fuchsia-300",  bg: "bg-fuchsia-500/20 border-fuchsia-500/30",dot: "bg-fuchsia-400",  order: 10 },
  offer_letter_received:     { label: "Offer Letter Received",                 phase: "enrollment", color: "text-pink-300",     bg: "bg-pink-500/20 border-pink-500/30",      dot: "bg-pink-400",     order: 11 },
  final_quote_sent:          { label: "Final Quote Sent",                      phase: "enrollment", color: "text-rose-300",     bg: "bg-rose-500/20 border-rose-500/30",      dot: "bg-rose-400",     order: 12 },
  contract_sent:             { label: "Offer Letter + Hello Contract Sent",    phase: "enrollment", color: "text-red-300",      bg: "bg-red-500/20 border-red-500/30",        dot: "bg-red-400",      order: 13 },
  read_carefully_email:      { label: '"Read Carefully" Email Sent',           phase: "enrollment", color: "text-sky-300",      bg: "bg-sky-500/20 border-sky-500/30",        dot: "bg-sky-400",      order: 14 },
  // Payments
  coe_deposit_paid:          { label: "CoE Deposit Paid",                      phase: "payments",   color: "text-orange-300",   bg: "bg-orange-500/20 border-orange-500/30",  dot: "bg-orange-400",   order: 15 },
  coe_issued:                { label: "CoE Issued",                            phase: "payments",   color: "text-yellow-300",   bg: "bg-yellow-500/20 border-yellow-500/30",  dot: "bg-yellow-400",   order: 16 },
  coe_confirmed:             { label: "CoE Confirmed by Student",              phase: "payments",   color: "text-lime-300",     bg: "bg-lime-500/20 border-lime-500/30",      dot: "bg-lime-400",     order: 17 },
  oshc_payment:              { label: "OSHC Payment Collected",                phase: "payments",   color: "text-teal-300",     bg: "bg-teal-500/20 border-teal-500/30",      dot: "bg-teal-400",     order: 18 },
  oshc_issued:               { label: "OSHC Issued",                           phase: "payments",   color: "text-cyan-300",     bg: "bg-cyan-500/20 border-cyan-500/30",      dot: "bg-cyan-400",     order: 19 },
  visa_fee_paid:             { label: "Visa Fee Paid",                         phase: "payments",   color: "text-green-300",    bg: "bg-green-500/20 border-green-500/30",    dot: "bg-green-400",    order: 20 },
  // Documents
  documents_signed:          { label: "Student Signed Documents",              phase: "documents",  color: "text-teal-300",     bg: "bg-teal-500/20 border-teal-500/30",      dot: "bg-teal-400",     order: 21 },
  visa_checklist_sent:       { label: "Visa Checklist Sent",                   phase: "documents",  color: "text-emerald-300",  bg: "bg-emerald-500/20 border-emerald-500/30",dot: "bg-emerald-400",  order: 22 },
  student_uploading_docs:    { label: "Student Uploading Documents",           phase: "documents",  color: "text-green-300",    bg: "bg-green-500/20 border-green-500/30",    dot: "bg-green-400",    order: 23 },
  gs_letter_draft_sent:      { label: "GS Letter Draft Sent",                  phase: "documents",  color: "text-lime-300",     bg: "bg-lime-500/20 border-lime-500/30",      dot: "bg-lime-400",     order: 24 },
  gs_letter_approved:        { label: "GS Letter Approved",                    phase: "documents",  color: "text-yellow-300",   bg: "bg-yellow-500/20 border-yellow-500/30",  dot: "bg-yellow-400",   order: 25 },
  documents_complete:        { label: "Documents Complete",                    phase: "documents",  color: "text-amber-300",    bg: "bg-amber-500/20 border-amber-500/30",    dot: "bg-amber-400",    order: 26 },
  // Visa
  visa_lodged:               { label: "Visa Application Lodged",               phase: "visa",       color: "text-blue-300",     bg: "bg-blue-500/20 border-blue-500/30",      dot: "bg-blue-400",     order: 27 },
  medical_requested:         { label: "Medical Examination Requested",         phase: "visa",       color: "text-indigo-300",   bg: "bg-indigo-500/20 border-indigo-500/30",  dot: "bg-indigo-400",   order: 28 },
  visa_granted:              { label: "Visa Granted",                          phase: "visa",       color: "text-emerald-300",  bg: "bg-emerald-500/20 border-emerald-500/30",dot: "bg-emerald-400",  order: 29 },
};

export const PHASE_CONFIG: Record<
  PhaseGroup,
  { label: string; color: string; headerBg: string; stages: PipelineStage[] }
> = {
  leads:      { label: "Leads",       color: "text-slate-300",    headerBg: "bg-slate-500/10 border-slate-500/20",    stages: ["new_lead", "first_contact"] },
  qualifying: { label: "Qualifying",  color: "text-cyan-300",     headerBg: "bg-cyan-500/10 border-cyan-500/20",      stages: ["initial_docs_requested", "initial_docs_received", "meeting_scheduled", "quotation_prepared"] },
  proposal:   { label: "Proposal",    color: "text-orange-300",   headerBg: "bg-orange-500/10 border-orange-500/20",  stages: ["followup", "student_approved_quotation"] },
  enrollment: { label: "Enrollment",  color: "text-purple-300",   headerBg: "bg-purple-500/10 border-purple-500/20",  stages: ["application_sent", "school_requested_docs", "offer_letter_received", "final_quote_sent", "contract_sent", "read_carefully_email"] },
  documents:  { label: "Documents",   color: "text-teal-300",     headerBg: "bg-teal-500/10 border-teal-500/20",      stages: ["documents_signed", "visa_checklist_sent", "student_uploading_docs", "gs_letter_draft_sent", "gs_letter_approved", "documents_complete"] },
  payments:   { label: "Payments",    color: "text-yellow-300",   headerBg: "bg-yellow-500/10 border-yellow-500/20",  stages: ["coe_deposit_paid", "coe_issued", "coe_confirmed", "oshc_payment", "oshc_issued", "visa_fee_paid"] },
  visa:       { label: "Visa",        color: "text-emerald-300",  headerBg: "bg-emerald-500/10 border-emerald-500/20",stages: ["visa_lodged", "medical_requested", "visa_granted"] },
};

export const PHASE_ORDER: PhaseGroup[] = ["leads", "qualifying", "proposal", "enrollment", "payments", "documents", "visa"];

export const ALL_STAGES: PipelineStage[] = Object.keys(STAGE_CONFIG) as PipelineStage[];

// ─── Stage auto-reminders ─────────────────────────────────────────────────────
// When a lead enters one of these stages, a reminder is auto-created for the consultant.
export const STAGE_AUTO_REMINDER: Partial<Record<PipelineStage, {
  days: number;
  message: string;
  type: Reminder["type"];
}>> = {
  initial_docs_requested: { days: 2,  message: "Follow-up: documentos iniciais ainda pendentes",           type: "whatsapp" },
  meeting_scheduled:      { days: 1,  message: "Confirmar reunião com o aluno amanhã",                     type: "call"     },
  followup:               { days: 3,  message: "Lead em follow-up — checar interesse e objeções",          type: "whatsapp" },
  student_approved_quotation: { days: 1, message: "Aluno aprovou cotação — iniciar aplicação na escola",   type: "other"    },
  application_sent:       { days: 5,  message: "Verificar retorno da escola sobre a aplicação",            type: "email"    },
  offer_letter_received:  { days: 2,  message: "Enviar cotação final ao aluno com a offer letter",         type: "whatsapp" },
  student_uploading_docs: { days: 3,  message: "Checar progresso dos documentos com o aluno",              type: "whatsapp" },
  coe_deposit_paid:       { days: 1,  message: "Confirmar emissão do CoE com a escola",                    type: "email"    },
  oshc_payment:           { days: 2,  message: "Confirmar emissão da apólice OSHC",                        type: "other"    },
  visa_lodged:            { days: 7,  message: "Verificar status do visto no ImmiAccount",                 type: "other"    },
  medical_requested:      { days: 5,  message: "Checar se aluno agendou exame médico",                     type: "whatsapp" },
  visa_granted:           { days: 1,  message: "Parabéns ao aluno e enviar checklist pré-embarque!",       type: "whatsapp" },
};

// ─── Next Action labels ───────────────────────────────────────────────────────
export const NEXT_ACTION_CONFIG: Record<NonNullable<NextAction>, { label: string; icon: string }> = {
  call_student:         { label: "Call Student",          icon: "📞" },
  whatsapp_student:     { label: "WhatsApp Student",      icon: "💬" },
  email_student:        { label: "Email Student",         icon: "📧" },
  schedule_meeting:     { label: "Schedule Meeting",      icon: "📅" },
  apply_to_school:      { label: "Apply to School",       icon: "📋" },
  review_documents:     { label: "Review Documents",      icon: "📂" },
  notify_visa_team:     { label: "Notify Visa Team",      icon: "📂" },
  send_visa_checklist:  { label: "Send Visa Checklist",   icon: "📂" },
  request_coe_deposit:  { label: "Request CoE Deposit",   icon: "💰" },
  collect_oshc_payment: { label: "Collect OSHC Payment",  icon: "💰" },
  collect_visa_fee:     { label: "Collect Visa Fee",      icon: "💰" },
  lodge_visa:           { label: "Lodge Visa",            icon: "🛂" },
  notify_student:       { label: "Notify Student",        icon: "🎉" },
};

export const NEXT_ACTION_OPTIONS: NonNullable<NextAction>[] = Object.keys(NEXT_ACTION_CONFIG) as NonNullable<NextAction>[];

// ─── Waiting For labels ───────────────────────────────────────────────────────
export const WAITING_FOR_CONFIG: Record<NonNullable<WaitingFor>, { label: string; icon: string }> = {
  student:          { label: "Student",                  icon: "👨‍🎓" },
  school:           { label: "School",                   icon: "🏫" },
  visa_team:        { label: "Visa Team",                icon: "📂" },
  payment:          { label: "Payment",                  icon: "💰" },
  insurance_provider:{ label: "Insurance Provider",     icon: "🏥" },
  home_affairs:     { label: "Dept. of Home Affairs",   icon: "🏛️" },
};

export const WAITING_FOR_OPTIONS: NonNullable<WaitingFor>[] = Object.keys(WAITING_FOR_CONFIG) as NonNullable<WaitingFor>[];

// ─── Stage Behavior Config ────────────────────────────────────────────────────
export const STAGE_BEHAVIOR_CONFIG: Record<
  PipelineStage,
  {
    defaultNextAction: NextAction;
    defaultWaitingFor: WaitingFor;
    responsibleTeam: "consultant" | "visa_team" | "admin";
    checklist: string[];
  }
> = {
  new_lead:                  { defaultNextAction: "call_student",         defaultWaitingFor: null,               responsibleTeam: "consultant", checklist: [] },
  first_contact:             { defaultNextAction: "whatsapp_student",     defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  initial_docs_requested:    { defaultNextAction: "email_student",        defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  initial_docs_received:     { defaultNextAction: "schedule_meeting",     defaultWaitingFor: null,               responsibleTeam: "consultant", checklist: [] },
  meeting_scheduled:         { defaultNextAction: "schedule_meeting",     defaultWaitingFor: null,               responsibleTeam: "consultant", checklist: [] },
  quotation_prepared:        { defaultNextAction: "email_student",        defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  followup:                  { defaultNextAction: "call_student",         defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  student_approved_quotation:{ defaultNextAction: "apply_to_school",      defaultWaitingFor: "school",           responsibleTeam: "consultant", checklist: [] },
  application_sent:          { defaultNextAction: null,                   defaultWaitingFor: "school",           responsibleTeam: "consultant", checklist: [] },
  school_requested_docs:     { defaultNextAction: "email_student",        defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  offer_letter_received:     { defaultNextAction: "email_student",        defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: ["Verify tuition", "Verify duration", "Verify campus", "Verify CRICOS", "Verify intake"] },
  final_quote_sent:          { defaultNextAction: "email_student",        defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  contract_sent:             { defaultNextAction: null,                   defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  read_carefully_email:      { defaultNextAction: "notify_visa_team",     defaultWaitingFor: "visa_team",        responsibleTeam: "visa_team",  checklist: [] },
  documents_signed:          { defaultNextAction: "send_visa_checklist",  defaultWaitingFor: "student",          responsibleTeam: "visa_team",  checklist: [] },
  visa_checklist_sent:       { defaultNextAction: null,                   defaultWaitingFor: "student",          responsibleTeam: "visa_team",  checklist: [] },
  student_uploading_docs:    { defaultNextAction: "review_documents",     defaultWaitingFor: "student",          responsibleTeam: "visa_team",  checklist: [] },
  gs_letter_draft_sent:      { defaultNextAction: null,                   defaultWaitingFor: "student",          responsibleTeam: "visa_team",  checklist: [] },
  gs_letter_approved:        { defaultNextAction: "review_documents",     defaultWaitingFor: null,               responsibleTeam: "visa_team",  checklist: [] },
  documents_complete:        { defaultNextAction: "request_coe_deposit",  defaultWaitingFor: "student",          responsibleTeam: "visa_team",  checklist: ["Passport", "GS Letter", "Financial Evidence", "CoE", "OSHC", "Visa Checklist Complete"] },
  coe_deposit_paid:          { defaultNextAction: null,                   defaultWaitingFor: "school",           responsibleTeam: "consultant", checklist: [] },
  coe_issued:                { defaultNextAction: "email_student",        defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  coe_confirmed:             { defaultNextAction: "collect_oshc_payment", defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  oshc_payment:              { defaultNextAction: null,                   defaultWaitingFor: "insurance_provider",responsibleTeam: "consultant", checklist: [] },
  oshc_issued:               { defaultNextAction: "collect_visa_fee",     defaultWaitingFor: "student",          responsibleTeam: "consultant", checklist: [] },
  visa_fee_paid:             { defaultNextAction: "lodge_visa",           defaultWaitingFor: null,               responsibleTeam: "visa_team",  checklist: [] },
  visa_lodged:               { defaultNextAction: null,                   defaultWaitingFor: "home_affairs",     responsibleTeam: "visa_team",  checklist: ["Visa lodged successfully", "Confirmation email sent"] },
  medical_requested:         { defaultNextAction: "email_student",        defaultWaitingFor: "student",          responsibleTeam: "visa_team",  checklist: [] },
  visa_granted:              { defaultNextAction: "notify_student",       defaultWaitingFor: null,               responsibleTeam: "consultant", checklist: [] },
};

// Legacy stage IDs (pre-July 2026 pipeline) — keeps Redis leads from crashing
Object.assign(STAGE_CONFIG as Record<string, unknown>, {
  waiting_response:   STAGE_CONFIG.initial_docs_requested,
  student_said_yes:   STAGE_CONFIG.student_approved_quotation,
  first_payment:      STAGE_CONFIG.coe_deposit_paid,
  school_deposit:     STAGE_CONFIG.coe_confirmed,
  oshc_policy:        STAGE_CONFIG.oshc_issued,
  visa_payment:       STAGE_CONFIG.visa_fee_paid,
  visa_checklist_call:STAGE_CONFIG.visa_checklist_sent,
  statement_reviewed: STAGE_CONFIG.gs_letter_draft_sent,
  final_doc_check:    STAGE_CONFIG.documents_complete,
  visa_applied:       STAGE_CONFIG.visa_lodged,
  final_instructions: STAGE_CONFIG.visa_granted,
});

export const TEMPERATURE_CONFIG = {
  hot:  { label: "Hot",  color: "text-red-300",    bg: "bg-red-500/20 border-red-500/30",       dot: "bg-red-400",    icon: "🔥" },
  warm: { label: "Warm", color: "text-orange-300", bg: "bg-orange-500/20 border-orange-500/30", dot: "bg-orange-400", icon: "☀️" },
  cold: { label: "Cold", color: "text-blue-300",   bg: "bg-blue-500/20 border-blue-500/30",     dot: "bg-blue-400",   icon: "❄️" },
};

export const TASK_TEMPLATES: Record<PipelineStage, string[]> = {
  new_lead:                  ["Add to CRM", "Verify contact info", "Assign to consultant"],
  first_contact:             ["Send welcome WhatsApp", "Introduce Hello Australia", "Ask about goals and timeline"],
  initial_docs_requested:    ["Send document request list", "Follow up if no reply in 48h", "Try alternate contact"],
  initial_docs_received:     ["Review received documents", "Schedule consultation meeting", "Confirm meeting via WhatsApp"],
  meeting_scheduled:         ["Confirm meeting date/time", "Prepare presentation materials", "Send calendar invite"],
  quotation_prepared:        ["Prepare course options", "Calculate total costs", "Send quotation document"],
  followup:                  ["Check if student reviewed quotation", "Address questions", "Set next follow-up date"],
  student_approved_quotation:["Collect student details for application", "Explain next steps", "Request initial documents"],
  application_sent:          ["Complete school application form", "Send application to school", "Confirm receipt with school"],
  school_requested_docs:     ["Contact student for required documents", "Send document list to student", "Follow up on document submission"],
  offer_letter_received:     ["Review offer letter terms", "Verify tuition/duration/campus/CRICOS/intake", "Explain offer to student"],
  final_quote_sent:          ["Prepare final quote with all costs", "Send quote to student", "Follow up for confirmation"],
  contract_sent:             ["Send Hello Australia contract", "Explain contract terms", "Follow up on signature"],
  read_carefully_email:      ["Draft 'Read Carefully' email", "CC Visa Team", "Include all important dates and payments"],
  documents_signed:          ["Receive signed documents", "Store in student file", "Prepare visa checklist"],
  visa_checklist_sent:       ["Send visa checklist to student", "Explain required documents", "Set upload deadline"],
  student_uploading_docs:    ["Monitor document uploads", "Review each document as received", "Request corrections if needed"],
  gs_letter_draft_sent:      ["Draft GS Letter / Statement of Purpose", "Send draft to student for review", "Await student approval"],
  gs_letter_approved:        ["Finalize GS Letter", "Add to document package", "Confirm all docs received"],
  documents_complete:        ["Final review of all documents", "Confirm passport validity", "Request CoE deposit"],
  coe_deposit_paid:          ["Confirm school deposit received", "Request school to issue CoE", "Update student file"],
  coe_issued:                ["Receive CoE from school", "Send CoE to student", "Confirm student receipt"],
  coe_confirmed:             ["Confirm student received CoE", "Collect OSHC payment", "Send OSHC payment instructions"],
  oshc_payment:              ["Collect OSHC payment", "Issue receipt", "Request OSHC policy from provider"],
  oshc_issued:               ["Receive OSHC policy", "Send policy to student", "Collect visa fee"],
  visa_fee_paid:             ["Confirm visa fee received", "Prepare final visa application", "Lodge visa application"],
  visa_lodged:               ["Submit visa application", "Provide confirmation to student", "Set expected decision date"],
  medical_requested:         ["Notify student about medical requirement", "Provide list of panel physicians", "Follow up on medical completion"],
  visa_granted:              ["Notify student of visa grant", "Send pre-departure checklist", "Confirm accommodation arranged"],
};

export const CONSULTANTS = [
  "André Perez",
];

export const COURSES: string[] = [
  "ELICOS – General English",
  "ELICOS – IELTS Preparation",
  "ELICOS – Business English",
  "VET – Certificate III",
  "VET – Certificate IV",
  "VET – Diploma",
  "Bachelor of IT",
  "Bachelor of Business",
  "Bachelor of Commerce",
  "Master of Business Analytics",
  "Master of Engineering",
  "Foundation Year",
  "Professional Year – IT",
  "Professional Year – Accounting",
  "Professional Year – Engineering",
];

export const CITIES = [
  "Sydney", "Melbourne", "Brisbane", "Gold Coast", "Adelaide", "Perth", "Canberra",
];

export interface MessageTemplate {
  label: string;
  channel: "whatsapp" | "email";
  subject?: string;
  body: string;
}

export const STAGE_TEMPLATES: Record<PipelineStage, MessageTemplate[]> = {
  new_lead: [
    {
      label: "Boas-vindas inicial",
      channel: "whatsapp",
      body: "Olá {name}! 👋 Aqui é {consultant} da Hello Australia. Vi que você tem interesse em estudar na Austrália — adoraria te ajudar a encontrar a melhor opção! Você tem um tempinho para conversar essa semana?",
    },
    {
      label: "Apresentação por e-mail",
      channel: "email",
      subject: "Bem-vindo(a) à Hello Australia! 🎓",
      body: "Olá {name},\n\nSeja muito bem-vindo(a) à Hello Australia! Sou {consultant} e vou ser seu consultor(a) durante toda essa jornada.\n\nNos especializamos em ajudar estudantes a realizarem o sonho de estudar e morar na Austrália, com suporte completo desde a escolha do curso até o visto.\n\nPode me contar um pouco mais sobre seus objetivos?\n\nAtenciosamente,\n{consultant}\nHello Australia",
    },
  ],
  first_contact: [
    {
      label: "Primeiro contato WhatsApp",
      channel: "whatsapp",
      body: "Oi {name}! 😊 Tudo bem? Sou {consultant} da Hello Australia. Estou aqui para te ajudar com seus planos de estudar em {city}! Você prefere conversar por aqui mesmo ou prefere agendar uma videochamada?",
    },
  ],
  initial_docs_requested: [
    {
      label: "Solicitação de documentos",
      channel: "whatsapp",
      body: "Oi {name}! 📋 Para continuarmos com o processo, preciso de alguns documentos seus. Vou te enviar a lista agora — qualquer dúvida, é só me chamar! 😊",
    },
    {
      label: "Follow-up documentos (2 dias)",
      channel: "whatsapp",
      body: "Oi {name}! Como você está? 😊 Só passando para lembrar sobre os documentos que pedi. Qualquer dificuldade, pode me chamar que te ajudo!",
    },
  ],
  initial_docs_received: [
    {
      label: "Documentos recebidos - Agendamento",
      channel: "whatsapp",
      body: "Oi {name}! ✅ Recebi seus documentos, obrigado! Já analisei tudo e gostaria de agendar uma reunião para apresentar as melhores opções para você. Tem disponibilidade essa semana?",
    },
  ],
  meeting_scheduled: [
    {
      label: "Confirmação de reunião",
      channel: "whatsapp",
      body: "Oi {name}! 🗓 Confirmando nossa conversa agendada! Mal posso esperar para te apresentar as opções de {course} em {city}. Se precisar remarcar, é só me avisar. Até logo! 😊",
    },
    {
      label: "Lembrete 1h antes",
      channel: "whatsapp",
      body: "Oi {name}! 👋 Lembrando que nossa reunião está chegando! Qualquer dificuldade para entrar na chamada, me avise. Nos vemos em breve! 🎯",
    },
  ],
  quotation_prepared: [
    {
      label: "Envio da cotação",
      channel: "whatsapp",
      body: "Oi {name}! 📋 Preparei uma simulação completa para você com as melhores opções de {course} em {city}. Vou te enviar agora — qualquer dúvida sobre os valores, pode me perguntar! 😊",
    },
    {
      label: "Follow-up cotação",
      channel: "whatsapp",
      body: "Oi {name}! Tudo bem? 😊 Queria saber se você teve chance de revisar a cotação que te enviei. Tem alguma dúvida ou algo que gostaria de ajustar?",
    },
  ],
  followup: [
    {
      label: "Follow-up pós-cotação",
      channel: "whatsapp",
      body: "Oi {name}! 👋 Estava pensando em você e queria saber se a proposta de {course} em {city} faz sentido para seus planos. Tem alguma dúvida que posso esclarecer? 😊",
    },
    {
      label: "Urgência - vagas limitadas",
      channel: "whatsapp",
      body: "Oi {name}! Passando para te avisar que as vagas para {course} estão preenchendo rápido. Se quiser garantir sua vaga, precisamos confirmar em breve! 🎓",
    },
  ],
  student_approved_quotation: [
    {
      label: "Confirmação e próximos passos",
      channel: "whatsapp",
      body: "Que notícia incrível, {name}! 🎉 Fico muito feliz com sua decisão! Vamos agora seguir para os próximos passos. Vou te enviar a lista de documentos necessários para a aplicação! 🙌",
    },
  ],
  application_sent: [
    {
      label: "Confirmação envio aplicação",
      channel: "whatsapp",
      body: "Oi {name}! ✅ Sua aplicação foi enviada para a escola! Normalmente eles respondem em 1-3 dias úteis com a Offer Letter. Vou te avisar assim que chegar! 📩",
    },
  ],
  school_requested_docs: [
    {
      label: "Escola pediu documentos adicionais",
      channel: "whatsapp",
      body: "Oi {name}! A escola solicitou alguns documentos adicionais para completar sua aplicação. Vou te enviar a lista agora — quanto antes enviar, mais rápido avançamos! 📋",
    },
  ],
  offer_letter_received: [
    {
      label: "Offer Letter recebida",
      channel: "whatsapp",
      body: "🎉 {name}! A Offer Letter chegou! Você foi aceito(a) no {course} em {city}! Vou te enviar o documento agora para você revisar. Me confirma quando tiver lido! 📄✨",
    },
    {
      label: "Email com Offer Letter",
      channel: "email",
      subject: "🎉 Sua Offer Letter chegou! - {name}",
      body: "Olá {name},\n\nExcelentes notícias! Sua Offer Letter foi recebida com sucesso! 🎓\n\nVocê foi aceito(a) no curso de {course} em {city}. Segue em anexo o documento para sua revisão.\n\nPor favor, confirme:\n✅ Seus dados pessoais estão corretos\n✅ O curso e duração estão conforme combinado\n✅ As datas de início estão de acordo\n\nAtenciosamente,\n{consultant}",
    },
  ],
  final_quote_sent: [
    {
      label: "Cotação final enviada",
      channel: "whatsapp",
      body: "Oi {name}! 📋 Acabei de te enviar a cotação final com todos os valores detalhados (curso + OSHC + taxa de visto). Revise com calma e me diga se tiver alguma dúvida! 😊",
    },
  ],
  contract_sent: [
    {
      label: "Envio do contrato",
      channel: "whatsapp",
      body: "Oi {name}! 📋 Acabei de te enviar por e-mail o contrato da Hello Australia junto com a Offer Letter para assinatura. Por favor, leia com atenção e assine digitalmente. Qualquer dúvida, pode me chamar! 😊",
    },
  ],
  read_carefully_email: [
    {
      label: "Email Leia com Atenção",
      channel: "email",
      subject: "⚠️ LEIA COM ATENÇÃO - Informações Importantes - {name}",
      body: "Olá {name},\n\n⚠️ Por favor, leia este e-mail com muita atenção pois contém informações cruciais para sua jornada na Austrália.\n\n📅 DATAS IMPORTANTES:\n• Início do curso: [DATA]\n• Prazo para pagamento do depósito: [DATA]\n• Prazo para solicitação do visto: [DATA]\n\n💰 PAGAMENTOS:\n• Depósito da escola: [VALOR]\n• OSHC (seguro saúde): [VALOR]\n• Taxa de visto: AUD 715\n\n📋 DOCUMENTOS NECESSÁRIOS PARA O VISTO:\n• Passaporte válido\n• Extrato bancário (últimos 3 meses)\n• Comprovante de pagamento do curso\n• Carta de intenção\n• Apólice OSHC\n\nAtenciosamente,\n{consultant}\nHello Australia",
    },
  ],
  documents_signed: [
    {
      label: "Documentos recebidos",
      channel: "whatsapp",
      body: "Perfeito, {name}! ✅ Recebi todos os documentos assinados! Agora vou preparar e enviar o Visa Checklist para você. Fique atento(a) ao seu e-mail! 📩",
    },
  ],
  visa_checklist_sent: [
    {
      label: "Checklist enviado",
      channel: "whatsapp",
      body: "Oi {name}! 📋 Acabei de te enviar o Visa Checklist com todos os documentos necessários para o visto. Por favor, revise e comece a reunir tudo. Qualquer dúvida sobre algum documento, é só me perguntar! 😊",
    },
  ],
  student_uploading_docs: [
    {
      label: "Acompanhamento de upload",
      channel: "whatsapp",
      body: "Oi {name}! 📂 Estou acompanhando os documentos que você está enviando. Se tiver dificuldade para enviar algum, me chame que te ajudo! Quanto mais rápido tivermos tudo, mais cedo damos entrada no visto. 😊",
    },
  ],
  gs_letter_draft_sent: [
    {
      label: "Rascunho GS Letter enviado",
      channel: "whatsapp",
      body: "Oi {name}! 📝 Acabei de te enviar o rascunho da sua GS Letter (carta de intenção). Por favor, leia com atenção, faça os ajustes que achar necessário e me devolva para aprovação final! 🙏",
    },
  ],
  gs_letter_approved: [
    {
      label: "GS Letter aprovada",
      channel: "whatsapp",
      body: "Ótimo, {name}! ✅ A GS Letter foi aprovada! Estou fazendo a revisão final de todos os seus documentos antes de darmos entrada no processo de pagamento. Já já te dou um retorno! 🎯",
    },
  ],
  documents_complete: [
    {
      label: "Documentos completos - Próximo passo",
      channel: "whatsapp",
      body: "🎉 {name}! Todos os seus documentos estão completos e revisados! Agora precisamos providenciar o depósito do CoE junto à escola. Vou te enviar as instruções de pagamento em breve! 💰",
    },
  ],
  coe_deposit_paid: [
    {
      label: "Confirmação depósito CoE",
      channel: "whatsapp",
      body: "Ótimo, {name}! ✅ Depósito do CoE confirmado! Já enviamos à escola e agora aguardamos a emissão do CoE. Vou te avisar assim que chegar! 📩",
    },
  ],
  coe_issued: [
    {
      label: "CoE emitido",
      channel: "whatsapp",
      body: "🎉 {name}! O CoE (Confirmação de Matrícula) foi emitido pela escola! Vou te enviar o documento agora. Me confirma o recebimento para seguirmos com o próximo passo! 📄",
    },
  ],
  coe_confirmed: [
    {
      label: "CoE confirmado - OSHC",
      channel: "whatsapp",
      body: "Ótimo, {name}! ✅ CoE confirmado! Agora precisamos providenciar o OSHC (seguro saúde obrigatório). Vou te enviar as instruções de pagamento agora. 🏥",
    },
  ],
  oshc_payment: [
    {
      label: "Detalhes OSHC",
      channel: "whatsapp",
      body: "Oi {name}! 🏥 O OSHC (Overseas Student Health Cover) é o seguro saúde obrigatório para estudantes internacionais na Austrália. Vou te enviar o valor e as instruções de pagamento agora.",
    },
  ],
  oshc_issued: [
    {
      label: "OSHC emitido - Taxa de visto",
      channel: "whatsapp",
      body: "🎉 {name}! Sua apólice OSHC foi emitida! Agora precisamos providenciar o pagamento da taxa de visto (AUD 715). Vou te enviar as instruções em breve! 🛂",
    },
  ],
  visa_fee_paid: [
    {
      label: "Taxa de visto paga",
      channel: "whatsapp",
      body: "Ótimo, {name}! ✅ Taxa de visto confirmada! Agora vou dar entrada na sua aplicação de visto. Qualquer novidade, te aviso imediatamente! 🛂",
    },
  ],
  visa_lodged: [
    {
      label: "Visto aplicado",
      channel: "whatsapp",
      body: "🎉 {name}! Sua aplicação de visto foi enviada ao Departamento de Imigração! O prazo médio de análise é de 4-6 semanas. Vou te atualizar assim que houver novidades! 🛂",
    },
    {
      label: "Email confirmação visto",
      channel: "email",
      subject: "✅ Visto Aplicado com Sucesso - {name}",
      body: "Olá {name},\n\n🎉 Sua aplicação de visto de estudante foi enviada com sucesso!\n\nDetalhes da aplicação:\n• Data: [DATA]\n• Prazo estimado: 4-6 semanas\n\nEnquanto aguarda, não compre passagens ainda — espere a aprovação do visto.\n\nAtenciosamente,\n{consultant}",
    },
  ],
  medical_requested: [
    {
      label: "Exame médico solicitado",
      channel: "whatsapp",
      body: "Oi {name}! O Departamento de Imigração solicitou um exame médico como parte do seu processo de visto. Vou te enviar a lista de clínicas credenciadas e as instruções. Não se preocupe, é um processo normal! 🏥",
    },
  ],
  visa_granted: [
    {
      label: "Visto aprovado! 🎉",
      channel: "whatsapp",
      body: "🎊🎉 {name}!! SEU VISTO FOI APROVADO!! Estou tão feliz por você! 🇦🇺✨ Agora é só preparar as malas e se preparar para a aventura da sua vida! Vou te enviar as instruções finais de embarque em breve! ✈️🦘",
    },
    {
      label: "Email visto aprovado",
      channel: "email",
      subject: "🎉 VISTO APROVADO! Parabéns, {name}!",
      body: "Olá {name},\n\n🎊 PARABÉNS! Seu visto de estudante foi APROVADO!\n\nEsta é uma conquista incrível e estamos muito felizes em fazer parte dessa jornada com você! 🇦🇺\n\nEm breve você receberá todas as instruções finais para o embarque.\n\nBoa viagem e bem-vindo(a) à Austrália! 🦘\n\n{consultant}\nHello Australia",
    },
  ],
};

export const SOURCES = [
  "Facebook Group", "Instagram", "Referral", "Website", "WhatsApp", "Walk-in", "Event", "LinkedIn", "Other",
];
