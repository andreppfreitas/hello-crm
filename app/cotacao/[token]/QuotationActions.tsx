"use client";

/** Impressão/PDF fica no cliente; a página em si é server-rendered. */
export function QuotationActions() {
  return (
    <button onClick={() => window.print()} className="q-btn" type="button">
      Salvar em PDF
    </button>
  );
}
