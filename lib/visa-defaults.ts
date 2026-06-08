import type { VisaChecklistItem } from "@/types";

export const DEFAULT_VISA_CHECKLIST: Omit<VisaChecklistItem, "id">[] = [
  { label: "Valid Passport (6+ months validity)", category: "identity", status: "pending" },
  { label: "Passport Photos (recent, white background)", category: "identity", status: "pending" },
  { label: "CoE – Confirmation of Enrolment", category: "enrollment", status: "pending" },
  { label: "Offer Letter from School", category: "enrollment", status: "pending" },
  { label: "Hello Australia Signed Contract", category: "enrollment", status: "pending" },
  { label: "OSHC Policy (active, full course duration)", category: "enrollment", status: "pending" },
  { label: "Bank Statements (last 3 months)", category: "financial", status: "pending" },
  { label: "Proof of Funds (AUD 21,041+ or equivalent)", category: "financial", status: "pending" },
  { label: "Sponsor/Guardian Financial Evidence (if applicable)", category: "financial", status: "pending" },
  { label: "Statement of Purpose / Intention Letter", category: "other", status: "pending" },
  { label: "English Proficiency Evidence (IELTS / PTE / TOEFL)", category: "other", status: "pending" },
  { label: "Academic Transcripts & Certificates", category: "other", status: "pending" },
  { label: "Health Examination (if required by DIBP)", category: "health", status: "pending" },
  { label: "Police Clearance Certificate (if required)", category: "health", status: "pending" },
  { label: "Visa Application Form 157A / online", category: "other", status: "pending" },
  { label: "Visa Application Fee Payment Receipt (AUD 715)", category: "financial", status: "pending" },
];

export function buildVisaChecklist(): VisaChecklistItem[] {
  return DEFAULT_VISA_CHECKLIST.map((item, i) => ({
    ...item,
    id: `visa-${i}`,
  }));
}
