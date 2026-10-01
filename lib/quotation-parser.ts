import { parseMoney } from "./commission";
import type {
  QuotationCourse, CostGroup, CostLine, FeeLine, ScheduledPayment,
} from "@/types/quotation";

/**
 * Leitura da cotação em PDF do 1Enrol.
 *
 * O formato é estável e tabular, então dá para ler com precisão — mas é layout
 * de terceiro, que muda sem aviso. Por isso o parser confere o que leu contra
 * os totais que o próprio PDF declara ("Total Curso: AUD$19.275,00") e avisa
 * quando não fecha, em vez de entregar número errado em silêncio.
 */

export interface ParsedQuotation {
  studentName?: string;
  consultantName?: string;
  consultantEmail?: string;
  branch?: string;
  sourceNumber?: string;
  issuedAt?: string;
  city?: string;
  courses: QuotationCourse[];
  costGroups: CostGroup[];
  schedule: ScheduledPayment[];
  /** Divergências e campos que o PDF não trouxe — viram aviso na revisão. */
  unresolved: string[];
}

/** Explicações que o PDF cru não dá e o aluno precisa. */
const EXPLICACOES: { re: RegExp; texto: string }[] = [
  { re: /visto|visa/i, texto: "Taxas pagas ao governo australiano no dia em que damos entrada no seu visto. Não são valores da escola nem da Hello." },
  { re: /seguro|health|oshc/i, texto: "OSHC é o seguro saúde obrigatório para todo estudante internacional na Austrália — sem ele o visto não sai." },
  { re: /outros|admin/i, texto: "Serviço da Hello Australia: acompanhamento do processo do começo ao fim, da matrícula até o visto aprovado." },
];

const MESES = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

/** "24 Aug 2026" → "2026-08-24". Também aceita dd/mm/yyyy e ISO. */
export function parseEnrolDate(raw: string): string | undefined {
  const s = raw.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return iso[0].slice(0, 10);

  const br = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;

  const txt = /^(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,})\.?,?\s+(\d{4})/.exec(s);
  if (txt) {
    const mes = MESES.indexOf(txt[2].toLowerCase().slice(0, 3));
    if (mes >= 0) return `${txt[3]}-${String(mes + 1).padStart(2, "0")}-${txt[1].padStart(2, "0")}`;
  }
  return undefined;
}

// "Taxa de Material 1 AUD 1,700.00 1,700.00" → label, qtd, unitário, TOTAL.
// O último número é o que vale: "Taxa de Matrícula 0 AUD 260.00 0.00" é isenta.
const LINHA_TAXA = /^(.+?)\s+(\d+)\s+AUD\s*\$?\s*([\d.,]+)\s+([\d.,]+)$/i;

// "Total Curso: AUD$19,275.00" / "TOTAL AUD$25,847.80"
const LINHA_TOTAL = /^Total\s*(.*?):?\s*AUD\s*\$?\s*([\d.,]+)$/i;

// "#226601.385322 15 Aug 2026 Material Fee Greenwich English College AUD$2,625.00"
const LINHA_PARCELA = /^#(\S+)\s+(\d{1,2}\s+[A-Za-zÀ-ÿ]{3,}\.?\s+\d{4})\s+(.+?)\s+AUD\s*\$?\s*([\d.,]+)$/i;

const TIPOS_PAGAMENTO = /^(Tuition Fee|Material Fee|Enrol?ment Fee|Visa|Health Cover|Others?|OSHC|Taxa[^,]*)\s+(.*)$/i;

const CABECALHOS_IGNORADOS = /^(qtd\b|resumo de pagamentos|c[âa]mbio:|consulte-nos|todos os valores|hellostudy\.com|[\w\s]+\+\d)/i;

let seq = 0;
const novoId = (p: string) => `${p}-${Date.now()}-${seq++}`;

export function parseQuotationText(raw: string): ParsedQuotation {
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const r: ParsedQuotation = { courses: [], costGroups: [], schedule: [], unresolved: [] };

  if (lines.length === 0) {
    r.unresolved.push("O PDF não tem texto legível — pode ser um arquivo escaneado.");
    return r;
  }

  type Secao =
    | { tipo: "curso"; curso: QuotationCourse }
    | { tipo: "grupo"; grupo: CostGroup }
    | null;
  let secao: Secao = null;
  let emCronograma = false;
  let totalDeclarado: number | null = null;
  const totaisDeclarados: { titulo: string; valor: number }[] = [];

  const fecharSecao = () => {
    if (secao?.tipo === "curso" && secao.curso.fees.length) r.courses.push(secao.curso);
    if (secao?.tipo === "grupo" && secao.grupo.lines.length) r.costGroups.push(secao.grupo);
    secao = null;
  };

  for (const line of lines) {
    // ── Cronograma de pagamentos ──
    if (/^resumo de pagamentos/i.test(line)) { fecharSecao(); emCronograma = true; continue; }
    if (emCronograma) {
      const m = LINHA_PARCELA.exec(line);
      if (m) {
        const dueDate = parseEnrolDate(m[2]);
        const bruto = m[3].trim();
        const tipo = TIPOS_PAGAMENTO.exec(bruto);
        r.schedule.push({
          id: novoId("sp"),
          dueDate: dueDate ?? "",
          description: tipo ? tipo[1].trim() : bruto,
          payee: tipo ? tipo[2].trim() || undefined : undefined,
          amount: parseMoney(m[4]) ?? 0,
        });
      }
      continue; // depois do cronograma vem rodapé e câmbio — nada a extrair
    }

    // ── Metadados ──
    const meta = /^(Estudante|Consultor|E-?mail|Filial|Data):\s*(.+)$/i.exec(line);
    if (meta) {
      const valor = meta[2].trim();
      const campo = meta[1].toLowerCase();
      if (campo === "estudante") r.studentName = valor;
      else if (campo === "consultor") r.consultantName = valor;
      else if (campo.startsWith("e")) r.consultantEmail = valor;
      else if (campo === "filial") r.branch = valor;
      else if (campo === "data") r.issuedAt = parseEnrolDate(valor);
      continue;
    }
    const num = /^Cota[çc][ãa]o\s*n?[ºo°]?\s*(\S+)/i.exec(line);
    if (num) { r.sourceNumber = num[1]; continue; }

    // ── Totais declarados pelo próprio PDF (usados para conferência) ──
    const tot = LINHA_TOTAL.exec(line);
    if (tot) {
      const valor = parseMoney(tot[2]);
      const titulo = tot[1].trim();
      if (valor !== null) {
        if (!titulo) totalDeclarado = valor;
        else totaisDeclarados.push({ titulo, valor });
      }
      fecharSecao();
      continue;
    }

    // ── Começo de um curso ──
    const curso = /^Curso\s*[-–]\s*(.*?)\s*[-–]\s*(.+)$/i.exec(line);
    if (curso) {
      fecharSecao();
      secao = {
        tipo: "curso",
        curso: {
          id: novoId("qc"),
          school: "", course: curso[2].trim(), location: curso[1].trim(),
          durationLabel: "", fees: [],
        },
      };
      if (!r.city) r.city = curso[1].split(",")[0].trim();
      continue;
    }

    // ── Campos do curso ──
    if (secao?.tipo === "curso") {
      const dur = /^Dura[çc][ãa]o:\s*(.+)$/i.exec(line);
      if (dur) { secao.curso.durationLabel = dur[1].trim(); continue; }

      const datas = /^In[íi]cio do Curso:\s*(.+?)(?:\s*\|\s*T[ée]rmino:\s*(.+))?$/i.exec(line);
      if (datas) {
        secao.curso.startDate = parseEnrolDate(datas[1]);
        if (datas[2]) secao.curso.endDate = parseEnrolDate(datas[2]);
        continue;
      }

      // Nome da escola: linha logo abaixo do curso, normalmente com o CRICOS
      if (!secao.curso.school && !LINHA_TAXA.test(line)) {
        const escola = /^(.+?)\s*\(([A-Z0-9]+)\)\s*$/.exec(line);
        if (escola) { secao.curso.school = escola[1].trim(); secao.curso.cricos = escola[2]; }
        else secao.curso.school = line;
        continue;
      }
    }

    // ── Linha de taxa ──
    const taxa = LINHA_TAXA.exec(line);
    if (taxa) {
      const total = parseMoney(taxa[4]);
      if (total === null) continue;
      const qtd = Number(taxa[2]);
      const unitario = parseMoney(taxa[3]);
      const detail = qtd > 1 && unitario ? `${qtd} × ${unitario.toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : undefined;

      if (secao?.tipo === "curso") {
        secao.curso.fees.push({ label: taxa[1].trim(), detail, amount: total } as FeeLine);
      } else if (secao?.tipo === "grupo") {
        secao.grupo.lines.push({ label: taxa[1].trim(), detail, amount: total } as CostLine);
      }
      continue;
    }

    // ── Cabeçalho de grupo (Visto, Outros, Seguro Saúde) ──
    if (!CABECALHOS_IGNORADOS.test(line) && line.length <= 40 && !/\d/.test(line)) {
      fecharSecao();
      secao = {
        tipo: "grupo",
        grupo: {
          id: novoId("cg"),
          title: line,
          explanation: EXPLICACOES.find((e) => e.re.test(line))?.texto,
          lines: [],
        },
      };
    }
  }
  fecharSecao();

  // ── Conferência contra os totais que o PDF declara ──
  const fmtNum = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 2 });
  for (const d of totaisDeclarados) {
    const alvo = /curso/i.test(d.titulo)
      ? r.courses.reduce((s, c) => s + c.fees.reduce((x, f) => x + f.amount, 0), 0)
      : r.costGroups.find((g) => g.title.toLowerCase() === d.titulo.toLowerCase())
          ?.lines.reduce((s, l) => s + l.amount, 0);
    if (alvo !== undefined && Math.abs(alvo - d.valor) > 0.01) {
      r.unresolved.push(`"${d.titulo}": li ${fmtNum(alvo)} mas o PDF declara ${fmtNum(d.valor)}. Confira.`);
    }
  }
  if (totalDeclarado !== null) {
    const lido = r.courses.reduce((s, c) => s + c.fees.reduce((x, f) => x + f.amount, 0), 0)
      + r.costGroups.reduce((s, g) => s + g.lines.reduce((x, l) => x + l.amount, 0), 0);
    if (Math.abs(lido - totalDeclarado) > 0.01) {
      r.unresolved.push(`Total geral: li ${fmtNum(lido)} mas o PDF declara ${fmtNum(totalDeclarado)}. Confira.`);
    }
  }

  // ── O que não veio ──
  if (r.courses.length === 0) r.unresolved.push("Nenhum curso reconhecido — preencha à mão.");
  for (const c of r.courses) {
    if (!c.school) r.unresolved.push(`Escola não identificada para "${c.course}".`);
    if (!c.startDate) r.unresolved.push(`Data de início não identificada para "${c.course}".`);
  }
  if (r.schedule.length === 0) {
    r.unresolved.push("Cronograma de pagamentos não encontrado — confira as datas com o aluno.");
  } else if (r.schedule.some((p) => !p.dueDate)) {
    r.unresolved.push("Alguma parcela ficou sem data de vencimento.");
  }

  return r;
}
