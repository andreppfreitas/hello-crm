"use client";

import { useEffect, useMemo, useState } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { STAGE_TEMPLATES, PHASE_ORDER, PHASE_CONFIG, STAGE_CONFIG, type MessageTemplate } from "@/lib/constants";
import type { Lead, CustomTemplate, PipelineStage } from "@/types";
import { MessageCircle, Mail, Copy, Search, X, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Channel = "whatsapp" | "email";

function fillTemplate(body: string, lead: Lead | null): string {
  if (!lead) return body;
  const course = lead.enrollments?.find((e) => e.course?.trim())?.course ?? lead.courseInterest ?? "seu curso";
  return body
    .replace(/\{name\}/g, lead.fullName.split(" ")[0])
    .replace(/\{consultant\}/g, lead.assignedConsultant.split(" ")[0])
    .replace(/\{course\}/g, String(course))
    .replace(/\{city\}/g, lead.currentCity ?? lead.preferredCity ?? "Australia");
}

function sendWhatsApp(lead: Lead, text: string) {
  const raw = lead.phone.replace(/\D/g, "");
  const phone = raw.startsWith("55") ? raw : `55${raw}`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
}

function sendEmail(lead: Lead, subject: string, text: string) {
  window.open(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, "_blank");
}

function TemplateCard({ tpl, lead, channel }: { tpl: { label: string; subject?: string; body: string }; lead: Lead | null; channel: Channel }) {
  const isWa = channel === "whatsapp";
  const body = fillTemplate(tpl.body, lead);
  const subject = tpl.subject ? fillTemplate(tpl.subject, lead) : "";

  function copy() {
    navigator.clipboard.writeText(subject ? `${subject}\n\n${body}` : body);
    toast.success("Template copiado");
  }

  function send() {
    if (!lead) return;
    if (isWa) sendWhatsApp(lead, body);
    else sendEmail(lead, subject, body);
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground truncate">{tpl.label}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={copy} title="Copiar" className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={send}
            disabled={!lead || (isWa ? !lead.phone : !lead.email)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              isWa ? "bg-emerald-600 hover:bg-emerald-500" : "bg-blue-600 hover:bg-blue-500"
            )}
          >
            {isWa ? <MessageCircle className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
            Enviar <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      {subject && <p className="text-xs font-medium text-blue-300">Assunto: {subject}</p>}
      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-6">{body}</p>
    </div>
  );
}

export default function TemplatesPage() {
  const { leads } = useCRM();
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [leadQuery, setLeadQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((d) => setCustomTemplates(d.templates ?? [])).catch(() => {});
  }, []);

  const matches = useMemo(() => {
    if (!leadQuery.trim()) return [];
    const q = leadQuery.toLowerCase();
    return leads.filter((l) => l.fullName.toLowerCase().includes(q)).slice(0, 6);
  }, [leadQuery, leads]);

  const isWa = channel === "whatsapp";
  const customFiltered = customTemplates.filter((t) => t.channel === channel);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header controls */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Channel tabs */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setChannel("whatsapp")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                isWa ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button
              onClick={() => setChannel("email")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                !isWa ? "bg-blue-500/15 border-blue-500/30 text-blue-300" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>

          {/* Lead selector */}
          <div className="relative flex-1">
            {selectedLead ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-foreground truncate">
                  Enviando para: <span className="font-semibold">{selectedLead.fullName}</span>
                  <span className="text-xs text-muted-foreground ml-2">{isWa ? selectedLead.phone : selectedLead.email}</span>
                </p>
                <button onClick={() => { setSelectedLead(null); setLeadQuery(""); }} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={leadQuery}
                  onChange={(e) => { setLeadQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar aluno para enviar direto..."
                  className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                />
                {showDropdown && matches.length > 0 && (
                  <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl p-1 max-h-64 overflow-y-auto">
                    {matches.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setSelectedLead(l); setShowDropdown(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <p className="text-sm text-foreground">{l.fullName}</p>
                        <p className="text-xs text-muted-foreground">{STAGE_CONFIG[l.stage]?.label} · {l.phone || "sem telefone"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedLead
            ? "Os templates abaixo já estão preenchidos com os dados do aluno. Clique em Enviar para abrir o WhatsApp/E-mail."
            : "Selecione um aluno para preencher os templates automaticamente e enviar direto. Sem aluno, use o botão de copiar."}
        </p>
      </div>

      {/* Custom templates */}
      {customFiltered.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Meus Templates</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customFiltered.map((t) => (
              <TemplateCard key={t.id} tpl={t} lead={selectedLead} channel={channel} />
            ))}
          </div>
        </div>
      )}

      {/* Stage templates grouped by phase */}
      {PHASE_ORDER.map((phase) => {
        const stages = PHASE_CONFIG[phase].stages as PipelineStage[];
        const sections = stages
          .map((stage) => ({
            stage,
            templates: (STAGE_TEMPLATES[stage] ?? []).filter((t: MessageTemplate) => t.channel === channel),
          }))
          .filter((s) => s.templates.length > 0);
        if (sections.length === 0) return null;
        return (
          <div key={phase} className="space-y-3">
            <div className={cn("flex items-center gap-2 pt-2 px-3 py-1.5 rounded-lg border w-fit", PHASE_CONFIG[phase].headerBg)}>
              <h2 className={cn("text-sm font-semibold", PHASE_CONFIG[phase].color)}>{PHASE_CONFIG[phase].label}</h2>
            </div>
            {sections.map(({ stage, templates }) => (
              <div key={stage} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">{STAGE_CONFIG[stage].label}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((t, i) => (
                    <TemplateCard key={`${stage}-${i}`} tpl={t} lead={selectedLead} channel={channel} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
