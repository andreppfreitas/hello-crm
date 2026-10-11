import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/db/redis";
import { findBrand } from "@/lib/brand-registry";

export const runtime = "nodejs";

/**
 * Logo de escola ou seguradora.
 *
 * Busca no servidor e guarda em cache, em vez de deixar o navegador do aluno
 * bater direto no site da escola: assim a cotação não vaza para terceiros quem
 * a está lendo, não quebra se o site sair do ar, e carrega do nosso domínio.
 *
 * Quem não tem logo resolvível recebe 404 — a página desenha o monograma.
 */

const TTL_OK = 60 * 60 * 24 * 30;   // 30 dias
const TTL_FAIL = 60 * 60 * 24;      // 1 dia: site fora do ar merece nova tentativa
const MAX_BYTES = 512 * 1024;
const KEY = (d: string) => `crm:brandlogo:${d}`;

interface Cached { ok: boolean; type?: string; b64?: string }

async function baixar(url: string, timeoutMs = 9000, trace?: string[]): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HelloCRM/1.0)" },
    });
    if (!res.ok) trace?.push(`  (${url} respondeu ${res.status})`);
    return res.ok ? res : null;
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    trace?.push(`  (${url} falhou: ${err.name} ${err.cause?.code ?? err.message})`);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Tenta os caminhos padrão e, por último, os <link rel="icon"> do HTML. */
async function resolverLogo(domain: string, trace: string[]): Promise<{ type: string; bytes: Uint8Array } | null> {
  // Muitos sites só respondem no www — tenta os dois
  const hosts = domain.startsWith("www.") ? [domain, domain.slice(4)] : [domain, `www.${domain}`];
  const paths = [
    "/apple-touch-icon.png",            // normalmente 180px, o melhor disponível
    "/apple-touch-icon-precomposed.png",
    "/favicon.png",
    "/favicon.ico",
  ];

  const tentar = async (url: string) => {
    const res = await baixar(url, 9000, trace);
    if (!res) { trace.push(`${url} → sem resposta`); return null; }
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) { trace.push(`${url} → ${res.status} ${type || "sem tipo"}`); return null; }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) { trace.push(`${url} → tamanho ${bytes.byteLength}`); return null; }
    trace.push(`${url} → OK ${type} ${bytes.byteLength}B`);
    return { type, bytes };
  };

  for (const host of hosts) {
    for (const path of paths) {
      const r = await tentar(`https://${host}${path}`);
      if (r) return r;
    }
  }

  // Nada nos caminhos padrão: lê os <link rel="icon"> da home
  for (const host of hosts) {
    const home = await baixar(`https://${host}/`, 12000, trace);
    if (!home) { trace.push(`https://${host}/ → sem resposta`); continue; }
    const html = (await home.text()).slice(0, 200_000);

    const links = html.match(/<link[^>]*>/gi) ?? [];
    const icones = links
      .filter((tag) => /rel\s*=\s*["'][^"']*icon/i.test(tag))
      .map((tag) => ({
        href: /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1],
        // "180x180" → 180; sem sizes vai para o fim da fila
        size: Number(/sizes\s*=\s*["'](\d+)/i.exec(tag)?.[1] ?? 0),
      }))
      .filter((i): i is { href: string; size: number } => !!i.href)
      .sort((a, b) => b.size - a.size);

    trace.push(`https://${host}/ → ${icones.length} <link icon>`);

    for (const { href } of icones.slice(0, 4)) {
      const absoluta = href.startsWith("http") ? href
        : href.startsWith("//") ? `https:${href}`
        : `https://${host}${href.startsWith("/") ? "" : "/"}${href}`;
      const r = await tentar(absoluta);
      if (r) return r;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nome = searchParams.get("name")?.trim();
  const override = searchParams.get("url")?.trim();
  if (!nome && !override) return new NextResponse(null, { status: 400 });

  // Domínio: o override manda; senão, a marca reconhecida pelo nome
  let domain: string | undefined;
  if (override) {
    try { domain = new URL(override).hostname; } catch { /* url inválida, ignora */ }
  }
  if (!domain) domain = nome ? findBrand(nome)?.domain : undefined;
  if (!domain) return new NextResponse(null, { status: 404 });

  const debug = searchParams.get("debug") === "1";
  const trace: string[] = [];
  const cacheKey = KEY(override ?? domain);
  const cache = await redis.get<Cached>(cacheKey).catch(() => null);
  if (cache?.ok && cache.b64 && cache.type) {
    return new NextResponse(Buffer.from(cache.b64, "base64"), {
      headers: { "Content-Type": cache.type, "Cache-Control": "public, max-age=604800, immutable" },
    });
  }
  if (cache && !cache.ok) return new NextResponse(null, { status: 404 });

  const encontrado = override
    ? await (async () => {
        const res = await baixar(override);
        trace.push(`override ${override} → ${res ? res.status : "sem resposta"}`);
        if (!res) return null;
        const type = res.headers.get("content-type") ?? "";
        if (!type.startsWith("image/")) return null;
        const bytes = new Uint8Array(await res.arrayBuffer());
        return bytes.byteLength && bytes.byteLength <= MAX_BYTES ? { type, bytes } : null;
      })()
    : await resolverLogo(domain, trace);

  if (debug) {
    return NextResponse.json({ nome, domain, encontrado: !!encontrado, tipo: encontrado?.type, trace });
  }

  if (!encontrado) {
    await redis.set(cacheKey, { ok: false } satisfies Cached, { ex: TTL_FAIL }).catch(() => {});
    return new NextResponse(null, { status: 404 });
  }

  await redis.set(
    cacheKey,
    { ok: true, type: encontrado.type, b64: Buffer.from(encontrado.bytes).toString("base64") } satisfies Cached,
    { ex: TTL_OK }
  ).catch(() => {});

  return new NextResponse(Buffer.from(encontrado.bytes), {
    headers: { "Content-Type": encontrado.type, "Cache-Control": "public, max-age=604800, immutable" },
  });
}
