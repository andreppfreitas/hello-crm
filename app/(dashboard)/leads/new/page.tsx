"use client";

import { useCRM } from "@/contexts/CRMContext";
import { CONSULTANTS, SOURCES, STAGE_CONFIG, PHASE_ORDER, PHASE_CONFIG, TEMPERATURE_CONFIG } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { LeadTemperature, PipelineStage, LeadSource } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="glass-card rounded-xl p-5 space-y-4">
    <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3">{title}</h3>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

const Field = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default function NewLeadPage() {
  const router = useRouter();
  const { addLead } = useCRM();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    country: "Brazil",
    currentCity: "",
    currentCountry: "",
    source: "Instagram" as LeadSource,
    temperature: "warm" as LeadTemperature,
    stage: "new_lead" as PipelineStage,
    assignedConsultant: CONSULTANTS[0],
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    const lead = addLead(form);
    toast.success(`${lead.fullName} added to CRM`);
    router.push(`/leads/${lead.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/leads">
          <Button variant="ghost" size="icon"><ChevronLeft className="w-4 h-4" /></Button>
        </Link>
        <h2 className="text-lg font-semibold">New Lead</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Dados Pessoais">
          <Field label="Nome completo *">
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Ana Silva" className="bg-secondary/50" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+55 11 99999-9999" className="bg-secondary/50" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ana@email.com" className="bg-secondary/50" />
          </Field>
          <Field label="País do passaporte">
            <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Brazil" className="bg-secondary/50" />
          </Field>
          <Field label="Cidade atual">
            <Input value={form.currentCity} onChange={(e) => set("currentCity", e.target.value)} placeholder="São Paulo" className="bg-secondary/50" />
          </Field>
          <Field label="País atual">
            <Input value={form.currentCountry} onChange={(e) => set("currentCountry", e.target.value)} placeholder="Brasil" className="bg-secondary/50" />
          </Field>
        </Section>

        <Section title="CRM Details">
          <Field label="Lead Source">
            <select value={form.source} onChange={(e) => set("source", e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Temperature">
            <div className="flex gap-2">
              {(["hot", "warm", "cold", "closed"] as LeadTemperature[]).map((t) => {
                const cfg = TEMPERATURE_CONFIG[t];
                return (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("temperature", t)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                    form.temperature === t ? `${cfg.bg} ${cfg.color}` : "bg-secondary/50 border-border text-muted-foreground"
                  )}
                >
                  {cfg.icon} {cfg.label}
                </button>
                );
              })}
            </div>
          </Field>
          <Field label="Pipeline Stage">
            <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              {PHASE_ORDER.map((phase) => (
                <optgroup key={phase} label={PHASE_CONFIG[phase].label}>
                  {PHASE_CONFIG[phase].stages.map((s) => (
                    <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Assigned Consultant">
            <select value={form.assignedConsultant} onChange={(e) => set("assignedConsultant", e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              {CONSULTANTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Initial Notes" full>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any initial observations about this lead..."
              rows={3}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
            />
          </Field>
        </Section>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Create Lead</Button>
        </div>
      </form>
    </div>
  );
}
