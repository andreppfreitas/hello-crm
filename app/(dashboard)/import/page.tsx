"use client";

import { useState, useRef } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { CONSULTANTS, CITIES, COURSES, SOURCES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, ArrowRight, Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { LeadTemperature, PipelineStage } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const LEAD_FIELDS = [
  { key: "fullName",           label: "Nome Completo",         required: true },
  { key: "phone",              label: "Telefone / WhatsApp",   required: false },
  { key: "email",              label: "E-mail",                required: false },
  { key: "country",            label: "País de Origem",        required: false },
  { key: "currentLocation",    label: "Localização Atual",     required: false },
  { key: "courseInterest",     label: "Interesse de Curso",    required: false },
  { key: "preferredCity",      label: "Cidade Preferida",      required: false },
  { key: "budget",             label: "Orçamento",             required: false },
  { key: "source",             label: "Fonte",                 required: false },
  { key: "temperature",        label: "Temperatura",           required: false },
  { key: "notes",              label: "Observações",           required: false },
  { key: "assignedConsultant", label: "Consultor",             required: false },
  { key: "skip",               label: "— Ignorar coluna —",   required: false },
] as const;

type FieldKey = typeof LEAD_FIELDS[number]["key"];

function parseCSVLine(line: string): string[] {
  // Handle quoted fields with commas inside
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

// Known header keywords — used to auto-detect the real header row
const HEADER_KEYWORDS = ["nome", "name", "telefone", "phone", "email", "curso", "course", "cidade", "city", "temperatura", "temperature", "consultor"];

function isHeaderRow(cells: string[]): boolean {
  const text = cells.join(" ").toLowerCase();
  return HEADER_KEYWORDS.filter((k) => text.includes(k)).length >= 2;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rawLines = text.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l.trim());
  if (rawLines.length === 0) return { headers: [], rows: [] };

  const parsed = rawLines.map(parseCSVLine);

  // Find the actual header row (skip decorative title rows from the Excel template)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(parsed.length, 8); i++) {
    if (isHeaderRow(parsed[i])) { headerIdx = i; break; }
  }

  const headers = parsed[headerIdx];
  // Data rows: skip template note rows (rows where all cells are empty or look like instructions)
  const rows = parsed
    .slice(headerIdx + 1)
    .filter((row) => {
      const first = row[0]?.trim() ?? "";
      // Skip rows that are clearly instructions/examples
      if (first.startsWith("←") || first.startsWith("*") || first.startsWith("★") || first.startsWith("Preencha")) return false;
      // Skip completely empty rows
      return row.some((c) => c.trim() !== "");
    });

  return { headers, rows };
}

function guessMapping(header: string): FieldKey {
  const h = header.toLowerCase();
  if (h.includes("nome") || h.includes("name")) return "fullName";
  if (h.includes("fone") || h.includes("phone") || h.includes("whats")) return "phone";
  if (h.includes("email") || h.includes("e-mail")) return "email";
  if (h.includes("pais") || h.includes("country") || h.includes("país")) return "country";
  if (h.includes("local") || h.includes("cidade atual") || h.includes("location")) return "currentLocation";
  if (h.includes("curso") || h.includes("course")) return "courseInterest";
  if (h.includes("city") || h.includes("cidade prefer")) return "preferredCity";
  if (h.includes("budget") || h.includes("orcamento") || h.includes("orçamento")) return "budget";
  if (h.includes("fonte") || h.includes("source") || h.includes("origem")) return "source";
  if (h.includes("temp")) return "temperature";
  if (h.includes("nota") || h.includes("note") || h.includes("obs")) return "notes";
  if (h.includes("consul")) return "assignedConsultant";
  return "skip";
}

const SAMPLE_CSV = `Nome Completo,Telefone,Email,Pais,Curso,Cidade Preferida,Temperatura
Ana Rodrigues,+55 11 99999-0001,ana@email.com,Brazil,ELICOS – General English,Sydney,hot
Carlos Mendes,+55 21 99999-0002,carlos@email.com,Brazil,VET – Diploma,Melbourne,warm
Julia Ferreira,+55 31 99999-0003,julia@email.com,Colombia,Master of Business Analytics,Brisbane,cold`;

export default function ImportPage() {
  const router = useRouter();
  const { addLead } = useCRM();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<number, FieldKey>>({});
  const [importedCount, setImportedCount] = useState(0);

  function handleParse() {
    const result = parseCSV(csvText);
    if (result.headers.length === 0) { toast.error("CSV inválido ou vazio"); return; }
    const autoMap: Record<number, FieldKey> = {};
    result.headers.forEach((h, i) => { autoMap[i] = guessMapping(h); });
    setMapping(autoMap);
    setParsed(result);
    setStep(2);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(String(ev.target?.result ?? ""));
    reader.readAsText(file);
  }

  function handleImport() {
    if (!parsed) return;
    let count = 0;
    for (const row of parsed.rows) {
      const data: Record<string, string> = {};
      Object.entries(mapping).forEach(([colIdx, field]) => {
        if (field !== "skip") data[field] = row[Number(colIdx)] ?? "";
      });
      if (!data.fullName?.trim()) continue;
      try {
        addLead({
          fullName: data.fullName.trim(),
          phone: data.phone ?? "",
          email: data.email ?? "",
          country: data.country ?? "Brazil",
          currentLocation: data.currentLocation ?? "",
          courseInterest: data.courseInterest ?? "",
          preferredCity: data.preferredCity ?? "",
          budget: data.budget ?? "",
          source: (data.source as any) ?? "Other",
          temperature: (["hot","warm","cold"].includes(data.temperature?.toLowerCase()) ? data.temperature.toLowerCase() : "warm") as LeadTemperature,
          stage: "new_lead" as PipelineStage,
          assignedConsultant: data.assignedConsultant || CONSULTANTS[0],
          notes: data.notes ?? "",
        });
        count++;
      } catch {}
    }
    setImportedCount(count);
    setStep(3);
    toast.success(`${count} leads importados com sucesso!`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-3">
        {([1, 2, 3] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
              step === s ? "bg-primary text-primary-foreground" :
              step > s  ? "bg-emerald-500 text-white" :
              "bg-secondary text-muted-foreground"
            )}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className={cn("text-sm font-medium", step === s ? "text-foreground" : "text-muted-foreground")}>
              {s === 1 ? "Colar CSV" : s === 2 ? "Mapear colunas" : "Concluído"}
            </span>
            {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15"><FileText className="w-5 h-5 text-primary" /></div>
                <div>
                  <h2 className="text-base font-semibold">Importar Leads via CSV</h2>
                  <p className="text-sm text-muted-foreground">Cole o conteúdo do CSV ou faça upload do arquivo</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground font-medium">Conteúdo CSV</label>
                  <div className="flex gap-2">
                    <button onClick={() => setCsvText(SAMPLE_CSV)} className="text-xs text-primary hover:underline">
                      Usar exemplo
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Upload arquivo
                    </button>
                    <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={"Nome,Telefone,Email,Curso...\nAna Silva,+55 11 99999-0000,ana@email.com,ELICOS"}
                  rows={10}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground font-mono resize-none focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => router.push("/leads")}>Cancelar</Button>
                <Button onClick={handleParse} disabled={!csvText.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Próximo: Mapear colunas <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Dicas</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>A primeira linha deve conter os cabeçalhos das colunas</li>
                <li>Separador: vírgula (,) — exportar como "CSV UTF-8" do Excel/Sheets</li>
                <li>A coluna "Nome Completo" é obrigatória; as demais são opcionais</li>
                <li>Temperatura aceita: hot, warm, cold (padrão: warm)</li>
                <li>Todos os leads importados entram como "New Lead"</li>
              </ul>
            </div>
          </motion.div>
        )}

        {step === 2 && parsed && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="glass-card rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold">Mapear Colunas</h2>
                <p className="text-sm text-muted-foreground">{parsed.rows.length} linhas detectadas · {parsed.headers.length} colunas</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {parsed.headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Coluna CSV</p>
                      <p className="text-sm font-medium text-foreground truncate">{header}</p>
                      <p className="text-xs text-muted-foreground/60 truncate">{parsed.rows[0]?.[i] ?? "—"}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <select
                      value={mapping[i] ?? "skip"}
                      onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value as FieldKey }))}
                      className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground"
                    >
                      {LEAD_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Preview (primeiros 3 leads)</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/50">
                      <tr>
                        {parsed.headers.map((h, i) => (
                          <th key={i} className={cn("px-3 py-2 text-left font-medium", mapping[i] === "skip" ? "text-muted-foreground/40" : "text-foreground")}>
                            {mapping[i] === "skip" ? <span className="line-through">{h}</span> : LEAD_FIELDS.find((f) => f.key === mapping[i])?.label ?? h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 3).map((row, r) => (
                        <tr key={r} className="border-t border-border">
                          {row.map((cell, c) => (
                            <td key={c} className={cn("px-3 py-2 text-muted-foreground", mapping[c] === "skip" && "opacity-30")}>{cell || "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button onClick={handleImport} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Upload className="w-4 h-4 mr-1.5" />
                  Importar {parsed.rows.length} leads
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{importedCount} leads importados!</h2>
            <p className="text-sm text-muted-foreground">Todos os leads foram adicionados como "New Lead" e estão prontos para uso.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setStep(1); setCsvText(""); setParsed(null); }}>Importar mais</Button>
              <Button onClick={() => router.push("/leads")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Ver todos os leads <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
