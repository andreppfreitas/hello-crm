"use client";

import { useState, useEffect } from "react";
import { STAGE_TEMPLATES } from "@/lib/constants";
import type { Lead } from "@/types";
import { X, MessageCircle, Mail, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

function fillTemplate(body: string, lead: Lead): string {
  const firstName = lead.fullName.split(" ")[0];
  const consultantFirst = lead.assignedConsultant.split(" ")[0];
  const course = lead.enrollments?.find((e) => e.course?.trim())?.course ?? lead.courseInterest ?? "seu curso";
  return body
    .replace(/\{name\}/g, firstName)
    .replace(/\{consultant\}/g, consultantFirst)
    .replace(/\{course\}/g, String(course))
    .replace(/\{city\}/g, lead.currentCity ?? lead.preferredCity ?? "Australia");
}

type Channel = "whatsapp" | "email";

export function WhatsAppTemplateModal({ lead, isOpen, onClose }: Props) {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const templates = (STAGE_TEMPLATES[lead.stage] ?? []).filter((t) => t.channel === channel);
  const [selected, setSelected] = useState(0);
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");

  function applyTemplate(idx: number, ch: Channel) {
    const list = (STAGE_TEMPLATES[lead.stage] ?? []).filter((t) => t.channel === ch);
    const t = list[idx];
    setSelected(idx);
    setText(t ? fillTemplate(t.body, lead) : "");
    setSubject(t?.subject ? fillTemplate(t.subject, lead) : "");
  }

  useEffect(() => {
    if (isOpen) {
      setChannel("whatsapp");
      applyTemplate(0, "whatsapp");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lead.id]);

  if (!isOpen) return null;

  function switchChannel(ch: Channel) {
    setChannel(ch);
    applyTemplate(0, ch);
  }

  function send() {
    if (channel === "whatsapp") {
      const raw = lead.phone.replace(/\D/g, "");
      const phone = raw.startsWith("55") ? raw : `55${raw}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      window.open(
        `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
    onClose();
  }

  const hasTemplates = templates.length > 0;
  const isWa = channel === "whatsapp";

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
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isWa ? "bg-emerald-500/20" : "bg-blue-500/20")}>
              {isWa ? <MessageCircle className="w-4 h-4 text-emerald-400" /> : <Mail className="w-4 h-4 text-blue-400" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isWa ? "WhatsApp" : "E-mail"} para {lead.fullName.split(" ")[0]}
              </p>
              <p className="text-xs text-muted-foreground">{isWa ? lead.phone : lead.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Channel tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => switchChannel("whatsapp")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors",
                isWa
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button
              onClick={() => switchChannel("email")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors",
                !isWa
                  ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                  : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
          </div>

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
                    onClick={() => applyTemplate(i, channel)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                      selected === i
                        ? isWa
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-blue-500/15 border-blue-500/30 text-blue-300"
                        : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject (email only) */}
          {!isWa && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assunto</p>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/50 transition-colors"
                placeholder="Assunto do e-mail..."
              />
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
              rows={isWa ? 6 : 8}
              className={cn(
                "w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none transition-colors",
                isWa ? "focus:border-emerald-500/50" : "focus:border-blue-500/50"
              )}
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
            disabled={!text.trim() || (!isWa && !lead.email)}
            className={cn(
              "h-9 px-5 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed",
              isWa ? "bg-emerald-600 hover:bg-emerald-500" : "bg-blue-600 hover:bg-blue-500"
            )}
          >
            {isWa ? <MessageCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
            {isWa ? "Abrir WhatsApp" : "Abrir E-mail"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
