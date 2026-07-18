"use client";

import { useState, useEffect } from "react";
import { STAGE_TEMPLATES } from "@/lib/constants";
import type { Lead } from "@/types";
import { X, MessageCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

function fillTemplate(body: string, lead: Lead): string {
  const firstName = lead.fullName.split(" ")[0];
  const consultantFirst = lead.assignedConsultant.split(" ")[0];
  return body
    .replace(/\{name\}/g, firstName)
    .replace(/\{consultant\}/g, consultantFirst)
    .replace(/\{city\}/g, lead.preferredCity ?? "Australia");
}

export function WhatsAppTemplateModal({ lead, isOpen, onClose }: Props) {
  const templates = (STAGE_TEMPLATES[lead.stage] ?? []).filter((t) => t.channel === "whatsapp");
  const [selected, setSelected] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelected(0);
      setText(templates[0] ? fillTemplate(templates[0].body, lead) : "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lead.id]);

  useEffect(() => {
    if (templates[selected]) {
      setText(fillTemplate(templates[selected].body, lead));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (!isOpen) return null;

  function send() {
    const raw = lead.phone.replace(/\D/g, "");
    const phone = raw.startsWith("55") ? raw : `55${raw}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    onClose();
  }

  const hasTemplates = templates.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg glass-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">WhatsApp para {lead.fullName.split(" ")[0]}</p>
              <p className="text-xs text-muted-foreground">{lead.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Template selector */}
          {hasTemplates && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Templates do estágio
              </p>
              <div className="flex flex-wrap gap-2">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                      selected === i
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editable textarea */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mensagem {!hasTemplates && "(sem template para este estágio — escreva sua mensagem)"}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="Digite sua mensagem..."
            />
            <p className="text-[10px] text-muted-foreground text-right">{text.length} caracteres</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-secondary/20">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={send}
            disabled={!text.trim()}
            className="h-9 px-5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Abrir WhatsApp
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
