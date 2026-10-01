"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lead } from "@/types";
import type { Quotation, QuotationCourse, VisaCostLine } from "@/types/quotation";
import { computeTotals, courseTotal, courseRemaining, quotationWarnings, fmt } from "@/lib/quotation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Upload, Plus, Trash2, Loader2, Link2, ExternalLink, FileText, TriangleAlert, Check,
} from "lucide-react";

const novoCurso = (): QuotationCourse => ({
  id: `qc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  school: "", course: "", durationLabel: "", startDate: "",
  fees: [{ label: "Tuition", amount: 0 }], deposit: 0, installments: [],
});

/** Campo numérico que aceita vazio sem virar 0 na cara do usuário. */
function NumInput({ value, onChange, placeholder, className }: {
  value: number; onChange: (n: number) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      type="number" step="0.01" inputMode="decimal"
      value={Number.isFinite(value) && value !== 0 ? value : value === 0 ? "" : ""}
      placeholder={placeholder ?? "0,00"}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={cn(
        "bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground tabular-nums",
        "placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50", className
      )}
    />
  );
}

export function QuotationsTab({ lead }: { lead: Lead }) {
  const [lista, setLista] = useState<Quotation[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Quotation | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [lendoPdf, setLendoPdf] = useState(false);
  const [pendencias, setPendencias] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/quotations?leadId=${lead.id}`);
      if (r.ok) setLista((await r.json()).quotations ?? []);
    } finally { setCarregando(false); }
  }, [lead.id]);

  useEffect(() => { carregar(); }, [carregar]);

  /** Cria a cotação já com o que o CRM sabe do aluno. */
  async function criar(base: Partial<Quotation> = {}, sourceFileName?: string) {
    setSalvando(true);
    try {
      const matriculas = (lead.enrollments ?? []).filter((e) => e.course?.trim() || e.school?.trim());
      const cursosDoLead: QuotationCourse[] = matriculas.map((e, i) => ({
        id: `qc-${Date.now()}-${i}`,
        school: e.school ?? "", course: e.course ?? "",
        durationLabel: "", startDate: e.courseStartDate ?? "",
        fees: [{ label: "Tuition", amount: 0 }],
        deposit: 0, installments: [],
      }));

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          packageName: lead.enrollments?.[0]?.course || "Proposta de estudo",
          courses: base.courses?.length ? base.courses : cursosDoLead,
          visaCosts: base.visaCosts ?? [],
          sourceFileName,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao criar cotação"); return; }
      setEditando(data.quotation);
      carregar();
    } catch { toast.error("Erro de conexão"); }
    finally { setSalvando(false); }
  }

  async function lerPdf(file: File) {
    setLendoPdf(true);
    setPendencias([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/quotations/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Não consegui ler o PDF"); return; }

      const { draft } = data;
      setPendencias(draft.unresolved ?? []);
      await criar({ courses: draft.courses, visaCosts: draft.visaCosts }, data.fileName);
      toast.success(
        draft.courses.length
          ? `${draft.courses.length} curso(s) lidos do PDF — confira antes de enviar`
          : "PDF lido, mas nada reconhecido — preencha à mão"
      );
    } catch { toast.error("Erro ao enviar o arquivo"); }
    finally { setLendoPdf(false); }
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    try {
      const res = await fetch(`/api/quotations/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editando),
      });
      if (!res.ok) { toast.error("Erro ao salvar"); return; }
      toast.success("Cotação salva");
      setEditando(null);
      carregar();
    } finally { setSalvando(false); }
  }

  async function excluir(q: Quotation) {
    if (!confirm(`Excluir a cotação ${q.number}? O link do aluno para de funcionar.`)) return;
    await fetch(`/api/quotations/${q.id}`, { method: "DELETE" });
    toast.success("Cotação excluída");
    carregar();
  }

  const linkDe = (q: Quotation) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/cotacao/${q.publicToken}`;

  // ── Editor ────────────────────────────────────────────────────────────────
  if (editando) {
    const q = editando;
    const set = (patch: Partial<Quotation>) => setEditando({ ...q, ...patch });
    const setCurso = (id: string, patch: Partial<QuotationCourse>) =>
      set({ courses: q.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
    const avisos = quotationWarnings(q);
    const t = computeTotals(q);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Cotação {q.number}</h3>
            {q.sourceFileName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <FileText className="w-3 h-3" /> {q.sourceFileName}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button size="sm" onClick={salvar} disabled={salvando}
              className="bg-primary text-primary-foreground hover:bg-primary/90">
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>

        {pendencias.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1">
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <TriangleAlert className="w-3.5 h-3.5" /> O PDF não trouxe tudo — confira:
            </p>
            {pendencias.map((p, i) => <p key={i} className="text-xs text-muted-foreground">• {p}</p>)}
          </div>
        )}

        {avisos.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3.5 space-y-1">
            <p className="text-xs font-semibold text-red-400">Revise antes de enviar ao aluno:</p>
            {avisos.map((a, i) => <p key={i} className="text-xs text-muted-foreground">• {a}</p>)}
          </div>
        )}

        <div className="glass-card rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">Nome do pacote</label>
            <Input value={q.packageName} onChange={(e) => set({ packageName: e.target.value })}
              placeholder="6 meses de inglês + 2 anos de Joinery" className="bg-secondary/50 mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cidade</label>
            <Input value={q.city} onChange={(e) => set({ city: e.target.value })} className="bg-secondary/50 mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Válida até</label>
            <Input type="date" value={q.validUntil ?? ""} onChange={(e) => set({ validUntil: e.target.value })}
              className="bg-secondary/50 mt-1" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">Aviso importante (opcional)</label>
            <textarea value={q.importantNote ?? ""} onChange={(e) => set({ importantNote: e.target.value })}
              rows={2} placeholder="Ex.: vagas para esta data de início acabam em 2 semanas."
              className="w-full mt-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary/50" />
          </div>
        </div>

        {/* Cursos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cursos</h4>
            <button onClick={() => set({ courses: [...q.courses, novoCurso()] })}
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3 h-3" /> Adicionar curso
            </button>
          </div>

          {q.courses.map((c, idx) => (
            <div key={c.id} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Curso {idx + 1}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-emerald-300 tabular-nums">
                    {fmt(courseTotal(c), q.currency)}
                  </span>
                  <button onClick={() => set({ courses: q.courses.filter((x) => x.id !== c.id) })}
                    className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input value={c.course} onChange={(e) => setCurso(c.id, { course: e.target.value })}
                  placeholder="Curso" className="bg-secondary/50" />
                <Input value={c.school} onChange={(e) => setCurso(c.id, { school: e.target.value })}
                  placeholder="Escola" className="bg-secondary/50" />
                <Input value={c.durationLabel} onChange={(e) => setCurso(c.id, { durationLabel: e.target.value })}
                  placeholder="Duração (ex: 24 semanas)" className="bg-secondary/50" />
                <Input type="date" value={c.startDate ?? ""} onChange={(e) => setCurso(c.id, { startDate: e.target.value })}
                  className="bg-secondary/50" />
              </div>

              {/* Taxas */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Taxas (desconto entra negativo)</p>
                {c.fees.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={f.label} placeholder="Tuition"
                      onChange={(e) => setCurso(c.id, { fees: c.fees.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}
                      className="bg-secondary/50 flex-1" />
                    <NumInput value={f.amount} className="w-32"
                      onChange={(n) => setCurso(c.id, { fees: c.fees.map((x, j) => j === i ? { ...x, amount: n } : x) })} />
                    <button onClick={() => setCurso(c.id, { fees: c.fees.filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => setCurso(c.id, { fees: [...c.fees, { label: "", amount: 0 }] })}
                  className="text-xs text-primary hover:underline">+ taxa</button>
              </div>

              {/* Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Entrada (para o CoE)</p>
                  <NumInput value={c.deposit} onChange={(n) => setCurso(c.id, { deposit: n })} className="w-full" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Saldo a parcelar: {fmt(courseRemaining(c), q.currency)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Parcelas</p>
                  {c.installments.map((t2, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <NumInput value={t2.count} className="w-16"
                        onChange={(n) => setCurso(c.id, { installments: c.installments.map((x, j) => j === i ? { ...x, count: n } : x) })} />
                      <span className="text-xs text-muted-foreground">×</span>
                      <NumInput value={t2.amount} className="flex-1"
                        onChange={(n) => setCurso(c.id, { installments: c.installments.map((x, j) => j === i ? { ...x, amount: n } : x) })} />
                      <button onClick={() => setCurso(c.id, { installments: c.installments.filter((_, j) => j !== i) })}
                        className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button onClick={() => setCurso(c.id, { installments: [...c.installments, { count: 1, amount: 0 }] })}
                    className="text-xs text-primary hover:underline">+ faixa de parcela</button>
                  <Input value={c.installmentNote ?? ""} placeholder="aprox. a cada 4 semanas"
                    onChange={(e) => setCurso(c.id, { installmentNote: e.target.value })}
                    className="bg-secondary/50 text-xs" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Custos de visto */}
        <div className="glass-card rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custos do visto</h4>
            <button onClick={() => set({ visaCosts: [...q.visaCosts, { label: "", amount: 0 } as VisaCostLine] })}
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
          {q.visaCosts.map((v, i) => (
            <div key={i} className="flex gap-2">
              <Input value={v.label} placeholder="Taxa do visto de estudante"
                onChange={(e) => set({ visaCosts: q.visaCosts.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}
                className="bg-secondary/50 flex-1" />
              <NumInput value={v.amount} className="w-32"
                onChange={(n) => set({ visaCosts: q.visaCosts.map((x, j) => j === i ? { ...x, amount: n } : x) })} />
              <button onClick={() => set({ visaCosts: q.visaCosts.filter((_, j) => j !== i) })}
                className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="glass-card rounded-xl p-4 border border-primary/30 bg-primary/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Cursos", t.coursesTotal], ["Visto", t.visaTotal],
            ["Paga agora", t.upfrontTotal], ["Total", t.grandTotal],
          ].map(([label, valor]) => (
            <div key={label as string}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{fmt(valor as number, q.currency)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Lista ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">Cotações</h3>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) lerPdf(f); }} />
          <Button size="sm" variant="outline" disabled={lendoPdf || salvando}
            onClick={() => fileRef.current?.click()} className="gap-1.5">
            {lendoPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Subir PDF do 1Enrol
          </Button>
          <Button size="sm" disabled={salvando} onClick={() => criar()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Em branco
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Suba o PDF que o 1Enrol gerou. O sistema lê o que consegue, você confere o que faltou,
        e o aluno recebe um link com a cotação explicada.
      </p>

      {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!carregando && lista.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma cotação para {lead.fullName.split(" ")[0]} ainda.
        </p>
      )}

      <div className="space-y-2">
        {lista.map((q) => {
          const t = computeTotals(q);
          const vencida = q.validUntil ? new Date(`${q.validUntil}T23:59:59`) < new Date() : false;
          return (
            <div key={q.id} className="glass-card rounded-xl p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {q.number} · {q.packageName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {q.courses.length} curso(s) · {fmt(t.grandTotal, q.currency)} ·{" "}
                    {vencida
                      ? <span className="text-red-400">vencida</span>
                      : <>válida até {q.validUntil?.split("-").reverse().join("/")}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => { navigator.clipboard.writeText(linkDe(q)); toast.success("Link copiado"); }}
                    title="Copiar link do aluno"
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Link2 className="w-4 h-4" />
                  </button>
                  <a href={`/cotacao/${q.publicToken}`} target="_blank" rel="noreferrer" title="Abrir como o aluno vê"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <Button size="sm" variant="outline" onClick={() => { setPendencias([]); setEditando(q); }}>Editar</Button>
                  <button onClick={() => excluir(q)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {quotationWarnings(q).length === 0 ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Pronta para enviar
                </p>
              ) : (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <TriangleAlert className="w-3 h-3" /> {quotationWarnings(q).length} ponto(s) a revisar
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
