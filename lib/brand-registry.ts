/**
 * Domínios de escolas e seguradoras, para buscar o logo.
 *
 * O nome que vem do 1Enrol é texto livre ("Greenwich English College (02672K)",
 * "BUPA OSHC - Single Cover"). Aqui ele é normalizado e casado contra uma lista
 * de marcas conhecidas do mercado australiano. O que não casa cai no monograma,
 * que é feio de propósito nenhum — é desenhado para parecer intencional.
 */

export interface Brand {
  /** Pedaços que identificam a marca dentro do texto livre. */
  match: string[];
  domain: string;
  label: string;
  /** Logo servido pelo próprio app, quando temos o arquivo. */
  localLogo?: string;
}

export const BRANDS: Brand[] = [
  // ── A casa ──
  { match: ["hello australia", "hello study"], domain: "hellostudy.com.br",
    label: "Hello Australia", localLogo: "/hello-logo.png" },

  // ── Seguradoras OSHC ──
  { match: ["bupa"],                      domain: "bupa.com.au",            label: "Bupa" },
  { match: ["nib"],                       domain: "nib.com.au",             label: "nib" },
  { match: ["medibank"],                  domain: "medibank.com.au",        label: "Medibank" },
  { match: ["allianz"],                   domain: "allianzcare.com.au",     label: "Allianz Care" },
  { match: ["ahm"],                       domain: "ahm.com.au",             label: "ahm" },

  // ── Escolas de inglês e colleges ──
  { match: ["greenwich"],                 domain: "greenwichcollege.edu.au", label: "Greenwich English College" },
  { match: ["ilsc"],                      domain: "ilsc.com",               label: "ILSC" },
  { match: ["ih sydney", "international house"], domain: "ihsydney.com.au",  label: "IH Sydney" },
  { match: ["kaplan"],                    domain: "kaplaninternational.com", label: "Kaplan" },
  { match: ["navitas"],                   domain: "navitas.com",            label: "Navitas" },
  { match: ["australian pacific college", "apc"], domain: "apc.edu.au",      label: "APC" },
  { match: ["english unlimited"],         domain: "englishunlimited.edu.au", label: "English Unlimited" },
  { match: ["sero"],                      domain: "seroinstitute.edu.au",   label: "SERO Institute" },
  { match: ["lloyds"],                    domain: "lloydsinternationalcollege.edu.au", label: "Lloyds" },
  { match: ["abm"],                       domain: "abm.edu.au",             label: "ABM" },
  { match: ["tafe"],                      domain: "tafensw.edu.au",         label: "TAFE NSW" },
  { match: ["waratah"],                   domain: "waratah.nsw.edu.au",     label: "Waratah" },
  { match: ["imagine education"],         domain: "imagineeducation.com.au", label: "Imagine Education" },
  { match: ["griffith"],                  domain: "griffith.edu.au",        label: "Griffith University" },
  { match: ["torrens"],                   domain: "torrens.edu.au",         label: "Torrens University" },

  // ── Governo ──
  { match: ["home affairs", "department of immigration", "australian government",
            "student visa", "subclass"],
    domain: "homeaffairs.gov.au", label: "Governo da Austrália" },
];

/** Tira CRICOS, sufixos de produto e pontuação: "BUPA OSHC - Single Cover" → "bupa oshc single cover". */
export function normalizeBrandName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")        // (02672K)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findBrand(raw: string | undefined): Brand | undefined {
  if (!raw?.trim()) return undefined;
  const nome = normalizeBrandName(raw);
  // Casa pelo pedaço mais longo primeiro, para "australian pacific college"
  // vencer "apc" quando os dois aparecem.
  return [...BRANDS]
    .sort((a, b) => Math.max(...b.match.map((m) => m.length)) - Math.max(...a.match.map((m) => m.length)))
    .find((b) => b.match.some((m) => new RegExp(`\\b${m}\\b`).test(nome)));
}

/** Iniciais para o monograma: "Greenwich English College" → "GE". */
export function brandInitials(raw: string): string {
  const palavras = normalizeBrandName(raw)
    .split(" ")
    .filter((p) => p.length > 1 && !["the", "of", "and", "college", "institute", "school"].includes(p));
  const base = palavras.length ? palavras : normalizeBrandName(raw).split(" ").filter(Boolean);
  if (base.length === 0) return "?";
  // Marca de uma palavra rende duas letras; "B" sozinho parece erro de carregamento
  if (base.length === 1) return base[0].slice(0, 2).toUpperCase();
  return base.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

/** Cor estável a partir do nome — a mesma escola tem sempre a mesma cor. */
export function brandHue(raw: string): number {
  let h = 0;
  for (const ch of raw) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
