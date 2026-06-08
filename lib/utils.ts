import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string, format: "short" | "long" | "relative" = "short") {
  const date = new Date(dateStr);
  if (format === "relative") {
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }
  if (format === "long") {
    return date.toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
  }
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function formatCurrency(amount: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
}
