"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lead } from "@/types";
import type { Quotation, QuotationCourse, CostGroup, ScheduledPayment } from "@/types/quotation";
import {
  computeTotals, courseTotal, groupTotal, sortedSchedule, quotationWarnings, fmt,
} from "@/lib/quotation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Upload, Plus, Trash2, Loader2, Link2, ExternalLink, FileText, TriangleAlert, Check,
} from "lucide-react";

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const novoCurso = (): QuotationCourse => ({
  id: uid("qc"), school: "", course: "", durationLabel: "", startDate: "",
  fees: [{ label: "Valor do Curso", amount: 0 }],
});

/** Número que aceita vazio sem virar 0 na cara de quem digita. */
function Num({ value, onChange, className, placeholder }: {
  value: number; onChange: (n: number) => void; className?: string; placeholder?: string;
}) {
  const [txt, setTxt] = useState(value ? String(value) : "");
  useEffect(() => { setTxt(value ? String(value) : ""); }, [value]);
  return (
    <input
      type="number" step="0.01" inputMode="decimal" value={txt} placeholder={placeholder ?? "0,00"}
      onChange={(e) => { setTxt(e.target.value); onChange(e.target.value === "" ? 0 : Number(e.target.value)); }}
      className={cn("bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground tabular-nums",
        "placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50", className)}
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

  async function criar(base: Partial<Quotation> = {}, sourceFileName?: string) {
    setSalvando(true);
    try {
      const matriculas = (lead.enrollments ?? []).filter((e) => e.course?.trim() || e.school?.trim());
      const cursosDoLead: QuotationCourse[] = matriculas.map((e) => ({
        id: uid("qc"), school: e.school ?? "", course: e.course ?? "",
        durationLabel: "", startDate: e.courseStartDate ?? "",
        fees: [{ label: "Valor do Curso", amount: 0 }],
      }));

      const res = await fetch("/api/quotations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          packageName: base.courses?.[0]?.course || lead.enrollments?.[0]?.course || "Proposta de estudo",
          city: base.city,
          courses: base.courses?.length ? base.courses : cursosDoLead,
          costGroups: base.costGroups ?? [],
          schedule: base.schedule ?? [],
          sourceNumber: base.sourceNumber,
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

      const d = data.draft;
      setPendencias(d.unresolved ?? []);
      await criar({
        courses: d.courses, costGroups: d.costGroups, schedule: d.schedule,
        city: d.city, sourceNumber: d.sourceNumber,
      }, data.fileName);

      const divergencias = (d.unresolved ?? []).filter((u: string) => /declara/i.test(u));
      if (divergencias.length) toast.warning("Li o PDF, mas algum total não fechou — confira");
      else if (d.courses.length) toast.success(`Cotação lida: ${d.courses.length} curso(s) e ${d.schedule.length} parcela(s)`);
      else toast.error("Não reconheci o conteúdo — preencha à mão");
    } catch { toast.error("Erro ao enviar o arquivo"); }
    finally { setLendoPdf(false); }
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    try {
      const res = await fetch(`/api/quotations/${editando.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editando),
      });
      if (!res.ok) { toast.error("Erro ao salvar"); return; }
      toast.success("Cotação salva");
      setEditando(null);
      carregar();
    } finally { setSalvando(false); }
  }

  async function excluir(q: Quotation) {
    if (!confirm(`Excluir a cotação ${q.sourceNumber ?? q.number}? O link do aluno para de funcionar.`)) return;
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
    const setGrupo = (id: string, patch: Partial<CostGroup>) =>
      set({ costGroups: q.costGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
    const avisos = quotationWarnings(q);
    const t = computeTotals(q);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Cotação {q.sourceNumber ?? q.number}</h3>
            {q.sourceFileName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <FileText className="w-3 h-3 flex-shrink-0" /> {q.sourceFileName}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
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
              <TriangleAlert className="w-3.5 h-3.5" /> O que o PDF não resolveu
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
            <label className="text-xs text-muted-foreground">Nome do pacote (o aluno vê como título)</label>
            <Input value={q.packageName} onChange={(e) => set({ packageName: e.target.value })}
              placeholder="Cert IV in Kitchen Management · Greenwich" className="bg-secondary/50 mt-1" />
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
              rows={2} placeholder="Ex.: as vagas para esta data de início acabam em 2 semanas."
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
                  <span className="text-xs font-semibold text-emerald-300 tabular-nums">{fmt(courseTotal(c), q.currency)}</span>
                  <button onClick={() => set({ courses: q.courses.filter((x) => x.id !== c.id) })}
                    className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input value={c.course} onChange={(e) => setCurso(c.id, { course: e.target.value })} placeholder="Curso" className="bg-secondary/50" />
                <Input value={c.school} onChange={(e) => setCurso(c.id, { school: e.target.value })} placeholder="Escola" className="bg-secondary/50" />
                <Input value={c.durationLabel} onChange={(e) => setCurso(c.id, { durationLabel: e.target.value })} placeholder="Duração (ex: 88 semanas)" className="bg-secondary/50" />
                <Input value={c.location ?? ""} onChange={(e) => setCurso(c.id, { location: e.target.value })} placeholder="Cidade do campus" className="bg-secondary/50" />
                <Input value={c.logoUrl ?? ""} onChange={(e) => setCurso(c.id, { logoUrl: e.target.value || undefined })}
                  placeholder="URL do logo da escola (opcional)" className="bg-secondary/50 sm:col-span-2" />
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Início</label>
                  <Input type="date" value={c.startDate ?? ""} onChange={(e) => setCurso(c.id, { startDate: e.target.value })} className="bg-secondary/50 mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Término</label>
                  <Input type="date" value={c.endDate ?? ""} onChange={(e) => setCurso(c.id, { endDate: e.target.value })} className="bg-secondary/50 mt-0.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Taxas (desconto entra negativo)</p>
                {c.fees.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={f.label} placeholder="Valor do Curso"
                      onChange={(e) => setCurso(c.id, { fees: c.fees.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}
                      className="bg-secondary/50 flex-1" />
                    <Num value={f.amount} className="w-32"
                      onChange={(n) => setCurso(c.id, { fees: c.fees.map((x, j) => j === i ? { ...x, amount: n } : x) })} />
                    <button onClick={() => setCurso(c.id, { fees: c.fees.filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => setCurso(c.id, { fees: [...c.fees, { label: "", amount: 0 }] })}
                  className="text-xs text-primary hover:underline">+ taxa</button>
              </div>
            </div>
          ))}
        </div>

        {/* Grupos de custo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Além do curso</h4>
            <button onClick={() => set({ costGroups: [...q.costGroups, { id: uid("cg"), title: "", lines: [] }] })}
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3 h-3" /> Adicionar grupo
            </button>
          </div>

          {q.costGroups.map((g) => (
            <div key={g.id} className="glass-card rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Input value={g.title} onChange={(e) => setGrupo(g.id, { title: e.target.value })}
                  placeholder="Visto / Seguro Saúde / Outros" className="bg-secondary/50 flex-1 font-medium" />
                <span className="text-xs font-semibold text-emerald-300 tabular-nums">{fmt(groupTotal(g), q.currency)}</span>
                <button onClick={() => set({ costGroups: q.costGroups.filter((x) => x.id !== g.id) })}
                  className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex gap-2">
                <Input value={g.brandName ?? ""} onChange={(e) => setGrupo(g.id, { brandName: e.target.value || undefined })}
                  placeholder="Marca (ex: Bupa)" className="bg-secondary/50 w-40" />
                <Input value={g.logoUrl ?? ""} onChange={(e) => setGrupo(g.id, { logoUrl: e.target.value || undefined })}
                  placeholder="URL do logo (opcional)" className="bg-secondary/50 flex-1" />
              </div>
              <textarea value={g.explanation ?? ""} onChange={(e) => setGrupo(g.id, { explanation: e.target.value })}
                rows={2} placeholder="Explique ao aluno o que é este custo e para quem vai o dinheiro."
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary/50" />
              {g.lines.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={l.label} placeholder="Descrição"
                    onChange={(e) => setGrupo(g.id, { lines: g.lines.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}
                    className="bg-secondary/50 flex-1" />
                  <Num value={l.amount} className="w-32"
                    onChange={(n) => setGrupo(g.id, { lines: g.lines.map((x, j) => j === i ? { ...x, amount: n } : x) })} />
                  <button onClick={() => setGrupo(g.id, { lines: g.lines.filter((_, j) => j !== i) })}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button onClick={() => setGrupo(g.id, { lines: [...g.lines, { label: "", amount: 0 }] })}
                className="text-xs text-primary hover:underline">+ linha</button>
            </div>
          ))}
        </div>

        {/* Cronograma */}
        <div className="glass-card rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cronograma de pagamentos
            </h4>
            <button onClick={() => set({ schedule: [...q.schedule, { id: uid("sp"), dueDate: "", description: "", amount: 0 }] })}
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3 h-3" /> Adicionar parcela
            </button>
          </div>
          {q.schedule.length === 0 && (
            <p className="text-xs text-muted-foreground">Sem parcelas. O aluno não verá a seção de datas.</p>
          )}
          {sortedSchedule(q.schedule).map((p) => (
            <div key={p.id} className="flex gap-2 items-center">
              <Input type="date" value={p.dueDate} className="bg-secondary/50 w-36"
                onChange={(e) => set({ schedule: q.schedule.map((x) => x.id === p.id ? { ...x, dueDate: e.target.value } : x) })} />
              <Input value={p.description} placeholder="Tuition Fee" className="bg-secondary/50 flex-1"
                onChange={(e) => set({ schedule: q.schedule.map((x) => x.id === p.id ? { ...x, description: e.target.value } : x) })} />
              <Num value={p.amount} className="w-28"
                onChange={(n) => set({ schedule: q.schedule.map((x) => x.id === p.id ? { ...x, amount: n } : x) })} />
              <button onClick={() => set({ schedule: q.schedule.filter((x) => x.id !== p.id) })}
                className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-xl p-4 border border-primary/30 bg-primary/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ["Cursos", t.coursesTotal], ["Além do curso", t.extrasTotal],
            ["Paga primeiro", t.upfrontTotal], ["Total", t.grandTotal],
          ] as [string, number][]).map(([label, valor]) => (
            <div key={label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{fmt(valor, q.currency)}</p>
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
        Suba o PDF do 1Enrol. O sistema lê curso, taxas, custos de visto e o cronograma de
        pagamentos, confere contra os totais que o próprio PDF declara, e gera um link
        explicado para o aluno.
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
          const avisos = quotationWarnings(q);
          return (
            <div key={q.id} className="glass-card rounded-xl p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {q.sourceNumber ?? q.number} · {q.packageName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {q.courses.length} curso(s) · {q.schedule.length} parcela(s) · {fmt(t.grandTotal, q.currency)} ·{" "}
                    {vencida ? <span className="text-red-400">vencida</span>
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
              {avisos.length === 0 ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Pronta para enviar</p>
              ) : (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <TriangleAlert className="w-3 h-3" /> {avisos.length} ponto(s) a revisar
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
