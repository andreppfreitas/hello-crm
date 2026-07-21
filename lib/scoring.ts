import type { Lead } from "@/types";
import { STAGE_CONFIG } from "./constants";

const BUDGET_SCORES: Record<string, number> = {
  "Under AUD 5,000": 3,
  "AUD 5,000–10,000": 8,
  "AUD 10,000–20,000": 12,
  "AUD 20,000–40,000": 14,
  "Over AUD 40,000": 16,
};

export function computeScore(lead: Lead): number {
  if (STAGE_CONFIG[lead.stage]?.phase === "visa" || lead.temperature === "closed") return 100;

  let score = 0;

  // Temperature (0–35)
  score += lead.temperature === "hot" ? 35 : lead.temperature === "warm" ? 20 : 5;

  // Contact engagement (0–15)
  score += Math.min(lead.contactHistory.length * 3, 15);

  // Notes added (0–8)
  score += Math.min(lead.notesList.length * 2, 8);

  // Budget (0–16)
  score += (lead.budget ? BUDGET_SCORES[lead.budget] : undefined) ?? 5;

  // Pipeline progress (0–14)
  const order = STAGE_CONFIG[lead.stage]?.order ?? 1;
  score += Math.round((order / 24) * 14);

  // Tasks completion ratio (0–7)
  const stageTasks = lead.tasks.filter((t) => t.stage === lead.stage);
  if (stageTasks.length > 0) {
    score += Math.round((stageTasks.filter((t) => t.completed).length / stageTasks.length) * 7);
  }

  // Time in current stage penalty (−20 to 0)
  const current = lead.stageHistory.find((h) => h.stage === lead.stage && !h.exitedAt);
  if (current) {
    const days = (Date.now() - new Date(current.enteredAt).getTime()) / 86400000;
    if (days > 21) score -= 20;
    else if (days > 14) score -= 14;
    else if (days > 7) score -= 7;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  if (score >= 25) return "text-orange-400";
  return "text-red-400";
}

export function scoreBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-400";
  if (score >= 50) return "bg-amber-400";
  if (score >= 25) return "bg-orange-400";
  return "bg-red-400";
}
