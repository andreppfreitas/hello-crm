"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  delta?: string;
  deltaPositive?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, iconColor = "text-primary", delta, deltaPositive, className }: StatCardProps) {
  return (
    <div className={cn("glass-card glass-card-hover rounded-xl p-4 flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
        <div className={cn("p-2 rounded-lg bg-white/5", iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {delta && (
        <p className={cn("text-xs font-medium", deltaPositive ? "text-emerald-400" : "text-red-400")}>
          {delta}
        </p>
      )}
    </div>
  );
}
