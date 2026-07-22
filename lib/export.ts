import type { Lead } from "@/types";
import { STAGE_CONFIG, PHASE_CONFIG, TEMPERATURE_CONFIG } from "./constants";
import { computeScore } from "./scoring";

const HEADERS = [
  "Nome", "Email", "Telefone", "País", "Cidade Atual", "Temperatura",
  "Fase", "Estágio", "Consultor", "Origem", "Cursos", "Escolas", "Score", "Criado em",
];

function leadRow(l: Lead): string[] {
  const stageCfg = STAGE_CONFIG[l.stage];
  const enrollments = (l.enrollments ?? []).filter((e) => e.course?.trim() || e.school?.trim());
  return [
    l.fullName,
    l.email,
    l.phone,
    l.country,
    l.currentCity ?? "",
    TEMPERATURE_CONFIG[l.temperature]?.label ?? l.temperature,
    stageCfg ? PHASE_CONFIG[stageCfg.phase].label : "",
    stageCfg?.label ?? l.stage,
    l.assignedConsultant,
    l.source,
    enrollments.map((e) => e.course).filter(Boolean).join(" | "),
    enrollments.map((e) => e.school).filter(Boolean).join(" | "),
    String(computeScore(l)),
    l.createdAt ? new Date(l.createdAt).toLocaleDateString("pt-BR") : "",
  ];
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);

export function exportCSV(leads: Lead[]) {
  // BOM + ";" para abrir certo no Excel PT-BR
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [HEADERS, ...leads.map(leadRow)].map((row) => row.map(escape).join(";"));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  download(blob, `leads-${today()}.csv`);
}

function tableHTML(leads: Lead[]): string {
  const th = HEADERS.map((h) => `<th style="background:#0f172a;color:#fff;padding:6px 10px;text-align:left;font-size:12px">${h}</th>`).join("");
  const rows = leads
    .map((l) => `<tr>${leadRow(l).map((v) => `<td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;font-size:12px">${v}</td>`).join("")}</tr>`)
    .join("");
  return `<table style="border-collapse:collapse;width:100%"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function exportExcel(leads: Lead[]) {
  // .xls via HTML table — abre direto no Excel sem dependência
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${tableHTML(leads)}</body></html>`;
  const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel" });
  download(blob, `leads-${today()}.xls`);
}

export function exportPDF(leads: Lead[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<html><head><meta charset="utf-8"><title>Hello Intelligence — Leads ${today()}</title>
    <style>body{font-family:Arial,sans-serif;margin:24px}h1{font-size:18px}p{font-size:12px;color:#64748b}@media print{button{display:none}}</style>
    </head><body>
    <h1>Hello Intelligence — Relatório de Leads</h1>
    <p>Gerado em ${new Date().toLocaleString("pt-BR")} · ${leads.length} leads</p>
    ${tableHTML(leads)}
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
