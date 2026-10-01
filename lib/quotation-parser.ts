import { parseMoney } from "./commission";
import type { FeeLine, QuotationCourse, VisaCostLine } from "@/types/quotation";

/**
 * Leitura do PDF de cotação do 1Enrol.
 *
 * O PDF não tem contrato nenhum com a gente: é layout de terceiro, muda sem
 * aviso. Então este parser é deliberadamente conservador — ele extrai o que
 * reconhece com segurança e deixa o resto em branco, para o consultor conferir
 * na tela de revisão. Em cotação, chutar um número é pior que deixar vazio.
 */

export interface ParsedQuotation {
  studentName?: string;
  city?: string;
  courses: QuotationCourse[];
  visaCosts: VisaCostLine[];
  /** O que o parser não conseguiu determinar — vira aviso na revisão. */
  unresolved: string[];
}

// Rótulos de taxa que aparecem em cotação de escola australiana
const FEE_LABELS: { re: RegExp; label: string }[] = [
  { re: /\btuition\s*(fee)?\b/i,                       label: "Tuition" },
  { re: /\benrol?ment\s*fee\b/i,                       label: "Enrolment Fee" },
  { re: /\bmaterial(s)?\s*(fee)?\b/i,                  label: "Material Fee" },
  { re: /\bresource(s)?\s*fee\b/i,                     label: "Resource Fee" },
  { re: /\bapplication\s*fee\b/i,                      label: "Application Fee" },
  { re: /\bpayment\s*plan\s*fee\b/i,                   label: "Payment Plan Fee" },
  { re: /\badmin(istration)?\s*fee\b/i,                label: "Administration Fee" },
  { re: /\bamenit(y|ies)\s*fee\b/i,                    label: "Amenities Fee" },
];

const VISA_LABELS: { re: RegExp; label: string }[] = [
  { re: /\b(student\s*visa|visa\s*(application\s*)?fee)\b/i, label: "Taxa do visto de estudante" },
  { re: /\boshc\b/i,                                         label: "OSHC (seguro saúde)" },
  { re: /\bmedical|health\s*exam/i,                          label: "Exame médico" },
  { re: /\bbiometric/i,                                      label: "Biometria" },
];

const DISCOUNT_RE = /\b(discount|desconto|scholarship|bolsa|loyalty|promo)\b/i;

/** Linhas não vazias, com espaços normalizados. */
function toLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Último valor monetário da linha — em tabela, é a coluna do valor. */
function amountInLine(line: string): number | null {
  const matches = line.match(/(?:AUD|A?\$|R\$)?\s*-?\d[\d.,]*/g);
  if (!matches) return null;
  for (let i = matches.length - 1; i >= 0; i--) {
    const token = matches[i].trim();
    // Ignora números soltos sem cara de dinheiro (ex.: "24" de "24 weeks")
    if (!/[.,]/.test(token) && !/AUD|\$/i.test(token)) continue;
    const value = parseMoney(token);
    if (value !== null && value !== 0) return /^-|\(-/.test(token) ? -Math.abs(value) : value;
  }
  return null;
}

function parseDate(line: string): string | undefined {
  // dd/mm/yyyy ou dd-mm-yyyy
  const br = /\b(\d{2})[/-](\d{2})[/-](\d{4})\b/.exec(line);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  // yyyy-mm-dd
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(line);
  if (iso) return iso[0];
  // 30 Nov 2026 / Nov 30, 2026
  const meses = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const txt = /\b(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})\b/i.exec(line)
          || /\b([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i.exec(line);
  if (txt) {
    const ehDiaPrimeiro = /^\d/.test(txt[1]);
    const dia = ehDiaPrimeiro ? txt[1] : txt[2];
    const mes = meses.indexOf((ehDiaPrimeiro ? txt[2] : txt[1]).toLowerCase().slice(0, 3));
    if (mes >= 0) return `${txt[3]}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }
  return undefined;
}

function parseDuration(line: string): string | undefined {
  const m = /\b(\d+(?:[.,]\d+)?)\s*(semanas?|weeks?|meses|m[eê]s|months?|anos?|years?)\b/i.exec(line);
  return m ? `${m[1]} ${m[2]}` : undefined;
}

let seq = 0;
const novoId = () => `qc-${Date.now()}-${seq++}`;

export function parseQuotationText(raw: string): ParsedQuotation {
  const lines = toLines(raw);
  const result: ParsedQuotation = { courses: [], visaCosts: [], unresolved: [] };

  if (lines.length === 0) {
    result.unresolved.push("O PDF não tem texto legível — pode ser um arquivo escaneado.");
    return result;
  }

  // Custos de visto: linha com rótulo conhecido e um valor
  for (const line of lines) {
    const hit = VISA_LABELS.find((v) => v.re.test(line));
    if (!hit) continue;
    const amount = amountInLine(line);
    if (amount === null) continue;
    if (result.visaCosts.some((v) => v.label === hit.label)) continue;
    result.visaCosts.push({ label: hit.label, amount });
  }

  // Cursos: um bloco começa quando aparece uma linha de Tuition.
  // Escola e curso são as linhas de texto imediatamente acima, sem valor.
  let atual: QuotationCourse | null = null;
  const fechar = () => { if (atual && atual.fees.length) result.courses.push(atual); atual = null; };

  lines.forEach((line, i) => {
    const feeHit = FEE_LABELS.find((f) => f.re.test(line));
    const amount = feeHit ? amountInLine(line) : null;

    if (feeHit && amount !== null) {
      const ehTuition = feeHit.label === "Tuition";
      if (ehTuition || !atual) {
        fechar();
        // Candidatas a escola/curso: linhas de texto puro acima do bloco.
        // Data, duração e rótulos soltos são descartados — já viraram campo próprio.
        const contexto = lines.slice(Math.max(0, i - 5), i).filter((l) =>
          amountInLine(l) === null &&
          l.length > 3 &&
          !parseDate(l) &&
          !parseDuration(l) &&
          !/^(curso|course|school|escola|student|aluno|quotation|cota[çc][ãa]o|start|in[íi]cio)\b/i.test(l)
        );
        atual = {
          id: novoId(),
          school: contexto[contexto.length - 2] ?? "",
          course: contexto[contexto.length - 1] ?? "",
          durationLabel: contexto.map(parseDuration).find(Boolean)
            ?? lines.slice(Math.max(0, i - 4), i + 2).map(parseDuration).find(Boolean) ?? "",
          startDate: lines.slice(Math.max(0, i - 4), i + 3).map(parseDate).find(Boolean),
          fees: [],
          deposit: 0,
          installments: [],
        };
      }
      const fee: FeeLine = {
        label: feeHit.label,
        amount: DISCOUNT_RE.test(line) ? -Math.abs(amount) : amount,
      };
      atual!.fees.push(fee);
      return;
    }

    // Desconto avulso, sem rótulo de taxa conhecido
    if (atual && DISCOUNT_RE.test(line)) {
      const desconto = amountInLine(line);
      if (desconto !== null) atual.fees.push({ label: line.replace(/[\d.,$]+\s*$/, "").trim() || "Desconto", amount: -Math.abs(desconto) });
    }
  });
  fechar();

  // O que ficou faltando
  if (result.courses.length === 0) {
    result.unresolved.push("Nenhum curso reconhecido — preencha os cursos à mão.");
  }
  for (const c of result.courses) {
    if (!c.school) result.unresolved.push(`Escola não identificada para "${c.course || "um dos cursos"}".`);
    if (!c.startDate) result.unresolved.push(`Data de início não identificada para "${c.course || "um dos cursos"}".`);
    if (!c.durationLabel) result.unresolved.push(`Duração não identificada para "${c.course || "um dos cursos"}".`);
  }
  if (result.visaCosts.length === 0) {
    result.unresolved.push("Custos de visto não encontrados no PDF — adicione manualmente.");
  }
  // Entrada e parcelamento quase nunca vêm legíveis no PDF da escola
  result.unresolved.push("Confira a entrada e o plano de parcelas de cada curso.");

  return result;
}
