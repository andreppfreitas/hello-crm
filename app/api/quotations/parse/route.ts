import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/security/auth";
import { extractText, getDocumentProxy } from "unpdf";
import { parseQuotationText } from "@/lib/quotation-parser";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — cotação de escola não passa disso

/**
 * Recebe o PDF do 1Enrol e devolve um rascunho de cotação.
 * Nada é gravado aqui: o consultor revisa na tela e só então salva.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie o PDF no campo 'file'." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "O arquivo está vazio." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF maior que 8 MB." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // %PDF- no início — evita tentar ler um .docx renomeado
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    return NextResponse.json({ error: "O arquivo não é um PDF." }, { status: 400 });
  }

  let text = "";
  let pages = 0;
  try {
    const pdf = await getDocumentProxy(bytes);
    pages = pdf.numPages;
    const result = await extractText(pdf, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  } catch {
    return NextResponse.json(
      { error: "Não consegui ler este PDF. Ele pode estar protegido por senha ou corrompido." },
      { status: 422 }
    );
  }

  const draft = parseQuotationText(text);

  return NextResponse.json({
    fileName: file.name,
    pages,
    // O texto cru volta para o consultor conferir contra o original
    rawText: text.slice(0, 20000),
    draft,
  });
}
