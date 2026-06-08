"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_TEMPLATES } from "@/lib/constants";
import type { Lead } from "@/types";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  lead: Lead;
  variant?: "default" | "icon";
  className?: string;
}

function buildMessage(template: string, lead: Lead): string {
  return template
    .replace(/{name}/g, lead.fullName.split(" ")[0])
    .replace(/{course}/g, lead.courseInterest || "o curso")
    .replace(/{city}/g, lead.preferredCity || "a cidade")
    .replace(/{consultant}/g, lead.assignedConsultant.split(" ")[0]);
}

export function WhatsAppButton({ lead, variant = "default", className }: WhatsAppButtonProps) {
  const templates = STAGE_TEMPLATES[lead.stage]?.filter((t) => t.channel === "whatsapp") ?? [];
  const template = templates[0];

  function openWhatsApp() {
    const raw = lead.phone.replace(/\D/g, "");
    const phone = raw.startsWith("55") ? raw : `55${raw}`;
    const message = template ? buildMessage(template.body, lead) : "";
    const url = `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
    window.open(url, "_blank");
  }

  if (variant === "icon") {
    return (
      <button
        onClick={openWhatsApp}
        title="Abrir WhatsApp"
        className={cn("p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors", className)}
      >
        <MessageCircle className="w-4 h-4" />
      </button>
    );
  }

  return (
    <Button
      onClick={openWhatsApp}
      size="sm"
      className={cn("bg-emerald-600 hover:bg-emerald-500 text-white gap-2", className)}
    >
      <MessageCircle className="w-4 h-4" />
      WhatsApp
    </Button>
  );
}
