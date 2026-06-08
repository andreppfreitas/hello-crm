"use client";

import { TEMPERATURE_CONFIG } from "@/lib/constants";
import type { LeadTemperature } from "@/types";
import { cn } from "@/lib/utils";

export function TemperatureBadge({ temp, className }: { temp: LeadTemperature; className?: string }) {
  const cfg = TEMPERATURE_CONFIG[temp];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", cfg.bg, cfg.color, className)}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
