"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/types";
import { cn } from "@/lib/utils";
import { WhatsAppTemplateModal } from "@/components/shared/WhatsAppTemplateModal";

interface WhatsAppButtonProps {
  lead: Lead;
  variant?: "default" | "icon";
  className?: string;
}

export function WhatsAppButton({ lead, variant = "default", className }: WhatsAppButtonProps) {
  const [open, setOpen] = useState(false);

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          title="Enviar WhatsApp"
          className={cn("p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors", className)}
        >
          <MessageCircle className="w-4 h-4" />
        </button>
        <WhatsAppTemplateModal lead={lead} isOpen={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className={cn("bg-emerald-600 hover:bg-emerald-500 text-white gap-2", className)}
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp
      </Button>
      <WhatsAppTemplateModal lead={lead} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
