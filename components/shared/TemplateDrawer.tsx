"use client";

import { useState } from "react";
import { STAGE_TEMPLATES, STAGE_CONFIG, type MessageTemplate } from "@/lib/constants";
import type { Lead } from "@/types";
import { cn } from "@/lib/utils";
import { Copy, Check, MessageCircle, Mail, X, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

interface TemplateDrawerProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}

function buildMessage(template: string, lead: Lead): string {
  return template
    .replace(/{name}/g, lead.fullName.split(" ")[0])
    .replace(/{course}/g, lead.courseInterest || "o curso")
    .replace(/{city}/g, lead.preferredCity || "a cidade")
    .replace(/{consultant}/g, lead.assignedConsultant.split(" ")[0]);
}

function TemplateCard({ template, lead }: { template: MessageTemplate; lead: Lead }) {
  const [copied, setCopied] = useState(false);
  const body = buildMessage(template.body, lead);
  const subject = template.subject ? buildMessage(template.subject, lead) : undefined;

  function copyToClipboard() {
    const text = subject ? `Assunto: ${subject}\n\n${body}` : body;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openWhatsApp() {
    const raw = lead.phone.replace(/\D/g, "");
    const phone = raw.startsWith("55") ? raw : `55${raw}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, "_blank");
  }

  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/20 hover:bg-secondary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            "p-1.5 rounded-lg",
            template.channel === "whatsapp" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"
          )}>
            {template.channel === "whatsapp" ? <MessageCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
          </span>
          <span className="text-sm font-medium text-foreground">{template.label}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            title="Copiar"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {template.channel === "whatsapp" && (
            <button
              onClick={openWhatsApp}
              className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-colors"
              title="Abrir no WhatsApp"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {subject && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Assunto:</span> {subject}
        </p>
      )}
      <div className="text-xs text-muted-foreground bg-background/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto scrollbar-thin">
        {body}
      </div>
    </div>
  );
}

export function TemplateDrawer({ lead, open, onClose }: TemplateDrawerProps) {
  const [filter, setFilter] = useState<"all" | "whatsapp" | "email">("all");
  const allTemplates = STAGE_TEMPLATES[lead.stage] ?? [];
  const filtered = filter === "all" ? allTemplates : allTemplates.filter((t) => t.channel === filter);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[440px] bg-card border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/15">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Templates de Mensagem</p>
                  <p className="text-xs text-muted-foreground">{STAGE_CONFIG[lead.stage].label}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lead info strip */}
            <div className="px-5 py-3 border-b border-border bg-secondary/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                {lead.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{lead.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-3 border-b border-border">
              {(["all", "whatsapp", "email"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                    filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  {f === "all" ? "Todos" : f === "whatsapp" ? "WhatsApp" : "E-mail"}
                  <span className="ml-1 text-[10px] opacity-60">
                    ({f === "all" ? allTemplates.length : allTemplates.filter((t) => t.channel === f).length})
                  </span>
                </button>
              ))}
            </div>

            {/* Templates list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum template para este filtro.</p>
              )}
              {filtered.map((template, i) => (
                <TemplateCard key={i} template={template} lead={lead} />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
