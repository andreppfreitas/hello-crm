import type { Metadata } from "next";
import "./quotation.css";

export const metadata: Metadata = {
  title: "Sua cotação · Hello Australia",
  description: "Proposta de estudo na Austrália preparada pela Hello Australia.",
  // Cotação é documento privado de um aluno — não entra em buscador
  robots: { index: false, follow: false },
};

export default function CotacaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
