"use client";

import { STAGE_CONFIG } from "@/lib/constants";
import type { PipelineStage } from "@/types";
import { cn } from "@/lib/utils";

export function StageBadge({ stage, className }: { stage: PipelineStage; className?: string }) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", cfg.bg, cfg.color, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
