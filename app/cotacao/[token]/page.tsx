import { notFound } from "next/navigation";
import { dbGetQuotationByToken } from "@/lib/db/activity-db";
import { dbGetLead } from "@/lib/db/leads-db";
import {
  computeTotals, courseTotal, groupTotal, sortedSchedule, fmt, estimateEndDate,
} from "@/lib/quotation";
import type { Quotation, QuotationCourse, CostGroup } from "@/types/quotation";
import { QuotationActions } from "./QuotationActions";
import { BrandLogo } from "./BrandLogo";

export const dynamic = "force-dynamic";

function dataBR(iso?: string, curta = false): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", curta
    ? { day: "2-digit", month: "short", year: "numeric" }
    : { day: "2-digit", month: "long", year: "numeric" });
}

function Linha({ label, detail, value, destaque, isento }: {
  label: string; detail?: string; value: string; destaque?: boolean; isento?: boolean;
}) {
  return (
    <div className="q-row">
      <div className="q-row-main">
        <p className={destaque ? "q-strong" : undefined}>{label}</p>
        {detail && <p className="q-detail">{detail}</p>}
      </div>
      <p className={`q-amount${destaque ? " q-strong" : ""}${isento ? " q-free" : ""}`}>
        {isento ? "Isento" : value}
      </p>
    </div>
  );
}

function CursoCard({ curso, indice, moeda }: { curso: QuotationCourse; indice: number; moeda: string }) {
  const total = courseTotal(curso);
  const fim = curso.endDate ?? (curso.startDate ? estimateEndDate(curso.startDate, curso.durationLabel) : undefined);

  return (
    <article className="q-card">
      <header className="q-card-head">
        <div className="q-brand-row q-min">
          <BrandLogo name={curso.school || curso.course} logoUrl={curso.logoUrl} size={44} />
          <div className="q-min">
          <p className="q-eyebrow">Curso {indice}</p>
          <h3 className="q-card-title">{curso.course || "Curso"}</h3>
          <p className="q-sub">
            {curso.school}
            {curso.cricos && <span className="q-detail"> · CRICOS {curso.cricos}</span>}
          </p>
          {curso.location && <p className="q-detail">{curso.location}</p>}
          </div>
        </div>
        <div className="q-card-amount">
          <p className="q-eyebrow">Investimento</p>
          <p className="q-card-total">{fmt(total, moeda)}</p>
        </div>
      </header>

      <div className="q-chips">
        {[["Duração", curso.durationLabel || "—"], ["Começa em", dataBR(curso.startDate)], ["Termina em", dataBR(fim)]]
          .map(([k, v]) => (
            <div key={k} className="q-chip">
              <p className="q-eyebrow">{k}</p>
              <p className="q-chip-value">{v}</p>
            </div>
          ))}
      </div>

      <p className="q-eyebrow q-mt">O que está incluso neste valor</p>
      <div>
        {curso.fees.map((f, i) => (
          <Linha key={i} label={f.label} detail={f.detail} value={fmt(f.amount, moeda)} isento={f.amount === 0} />
        ))}
        <Linha label="Total do curso" value={fmt(total, moeda)} destaque />
      </div>
    </article>
  );
}

function GrupoCard({ grupo, moeda }: { grupo: CostGroup; moeda: string }) {
  return (
    <article className="q-card">
      <div className="q-brand-row">
        {grupo.brandName && <BrandLogo name={grupo.brandName} logoUrl={grupo.logoUrl} size={36} />}
        <div className="q-min">
          <h3 className="q-card-title q-card-title-sm">{grupo.title}</h3>
          {grupo.brandName && <p className="q-detail">{grupo.brandName}</p>}
        </div>
      </div>
      {grupo.explanation && <p className="q-lede q-mt-sm">{grupo.explanation}</p>}
      <div className="q-mt">
        {grupo.lines.map((l, i) => (
          <Linha key={i} label={l.label} detail={l.detail} value={fmt(l.amount, moeda)} isento={l.amount === 0} />
        ))}
        <Linha label={`Total ${grupo.title.toLowerCase()}`} value={fmt(groupTotal(grupo), moeda)} destaque />
      </div>
    </article>
  );
}

export default async function CotacaoPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const q: Quotation | null = await dbGetQuotationByToken(token);
  if (!q) notFound();
  const lead = await dbGetLead(q.leadId);
  return <QuotationView quotation={q} studentName={lead?.fullName} />;
}

/** Separado da busca de dados para poder ser renderizado com dados controlados. */
export function QuotationView({ quotation: q, studentName }: { quotation: Quotation; studentName?: string }) {
  const t = computeTotals(q);
  const vencida = q.validUntil ? new Date(`${q.validUntil}T23:59:59`).getTime() < Date.now() : false;

  // Agrupa o cronograma por data: o aluno pensa em "o que pago neste dia"
  const porData = sortedSchedule(q.schedule).reduce<Record<string, typeof q.schedule>>((acc, p) => {
    (acc[p.dueDate] ??= []).push(p);
    return acc;
  }, {});
  const datas = Object.keys(porData);

  return (
    <div className="q-root">
      <div className="q-wrap">

        <header className="q-header">
          <div className="q-card-head">
            <div className="q-min">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hello-logo.png" alt="Hello Australia" className="q-hello-logo" />
              <p className="q-eyebrow q-mt-sm">
                Cotação {q.sourceNumber ?? q.number}
              </p>
              <h1 className="q-title">{q.packageName}</h1>
              <p className="q-sub">{q.city}</p>
            </div>
            <QuotationActions />
          </div>

          <div className="q-chips q-chips-4">
            {[
              ["Preparada para", studentName ?? "—"],
              ["Seu consultor", q.createdBy],
              ["Emitida em", dataBR(q.createdAt.slice(0, 10), true)],
              ["Válida até", dataBR(q.validUntil, true)],
            ].map(([k, v]) => (
              <div key={k} className="q-chip">
                <p className="q-eyebrow">{k}</p>
                <p className="q-chip-value">{v}</p>
              </div>
            ))}
          </div>
        </header>

        {vencida && (
          <div className="q-alert q-alert-warn">
            <strong>Esta cotação expirou em {dataBR(q.validUntil)}.</strong> Valores e vagas podem
            ter mudado — fale com {q.createdBy} para receber uma atualizada.
          </div>
        )}

        {q.importantNote && (
          <div className="q-alert">
            <p className="q-eyebrow">Importante</p>
            <p className="q-mt-sm q-pre">{q.importantNote}</p>
          </div>
        )}

        {/* A primeira pergunta do aluno é "quanto preciso agora" */}
        <section className="q-summary">
          <div>
            <p className="q-eyebrow">
              {t.upfrontDate ? `Para começar, você paga em ${dataBR(t.upfrontDate)}` : "Para começar, você paga"}
            </p>
            <p className="q-big">{fmt(t.upfrontTotal, q.currency)}</p>
            {t.remainingTotal > 0 && (
              <p className="q-sub q-mt-sm">
                O restante, {fmt(t.remainingTotal, q.currency)}, você paga ao longo do curso —
                as datas estão todas listadas abaixo.
              </p>
            )}
          </div>
          <div className="q-summary-side">
            <Linha label="Cursos" value={fmt(t.coursesTotal, q.currency)} />
            {q.costGroups.map((g) => (
              <Linha key={g.id} label={g.title} value={fmt(groupTotal(g), q.currency)} />
            ))}
            <Linha label="Investimento total" value={fmt(t.grandTotal, q.currency)} destaque />
          </div>
        </section>

        <section className="q-section">
          <h2 className="q-h2">{q.courses.length > 1 ? "Seus cursos" : "Seu curso"}</h2>
          <div className="q-stack">
            {q.courses.map((c, i) => <CursoCard key={c.id} curso={c} indice={i + 1} moeda={q.currency} />)}
          </div>
        </section>

        {q.costGroups.length > 0 && (
          <section className="q-section">
            <h2 className="q-h2">Além do curso</h2>
            <p className="q-lede">
              Estes valores não são da escola. Vão para o governo, para a seguradora e para a Hello.
            </p>
            <div className="q-stack">
              {q.costGroups.map((g) => <GrupoCard key={g.id} grupo={g} moeda={q.currency} />)}
            </div>
          </section>
        )}

        {datas.length > 0 && (
          <section className="q-section">
            <h2 className="q-h2">Quando você paga cada parte</h2>
            <p className="q-lede">
              São {q.schedule.length} pagamentos ao longo do curso. Nenhuma surpresa: as datas
              e os valores estão todos aqui.
            </p>
            <ol className="q-timeline">
              {datas.map((data, i) => {
                const itens = porData[data];
                const soma = itens.reduce((s, p) => s + p.amount, 0);
                return (
                  <li key={data} className={i === 0 ? "q-timeline-first" : undefined}>
                    <div className="q-timeline-dot" />
                    <div className="q-timeline-body">
                      <div className="q-row">
                        <div className="q-row-main">
                          <p className="q-strong">{dataBR(data)}</p>
                          {i === 0 && <p className="q-detail">Para iniciar o seu processo</p>}
                        </div>
                        <p className="q-amount q-strong">{fmt(soma, q.currency)}</p>
                      </div>
                      {itens.map((p) => (
                        <div key={p.id} className="q-row q-row-sub">
                          <div className="q-row-main">
                            <p>{p.description}</p>
                            {p.payee && <p className="q-detail">para {p.payee}</p>}
                          </div>
                          <p className="q-amount">{fmt(p.amount, q.currency)}</p>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="q-detail">
              Total do cronograma: {fmt(t.scheduleTotal, q.currency)}. As datas podem ajustar alguns
              dias conforme a escola confirmar a matrícula.
            </p>
          </section>
        )}

        <section className="q-section">
          <h2 className="q-h2">Como funciona daqui para frente</h2>
          <ol className="q-steps">
            {[
              ["Você aprova esta cotação", `Responda para ${q.createdBy} confirmando o pacote escolhido.`],
              ["Faz o primeiro pagamento", `${fmt(t.upfrontTotal, q.currency)}${t.upfrontDate ? ` até ${dataBR(t.upfrontDate)}` : ""}. É o que libera a escola a emitir o seu CoE, o documento que comprova a matrícula.`],
              ["Reunimos seus documentos", "Passaporte, extrato bancário e a carta de intenção. A gente te guia em cada um."],
              ["Damos entrada no visto", "Com o CoE e o seguro saúde em mãos, protocolamos a sua aplicação."],
              ["Você embarca", "Acompanhamos a análise da imigração e te avisamos a cada novidade."],
            ].map(([titulo, texto], i) => (
              <li key={i}>
                <span className="q-step-num">{i + 1}</span>
                <div>
                  <p className="q-strong">{titulo}</p>
                  <p className="q-sub q-mt-xs">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="q-footer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hello-logo.png" alt="Hello Australia" className="q-hello-logo q-hello-logo-sm" />
          <p className="q-mt-sm">
            Dúvida em qualquer ponto desta cotação? Fale com <strong>{q.createdBy}</strong> —
            é melhor perguntar antes de pagar qualquer coisa.
          </p>
          <p className="q-detail q-mt-sm">
            Hello Australia · Cotação {q.sourceNumber ?? q.number} · Valores em {q.currency},
            sujeitos a alteração pela escola até a confirmação da matrícula.
          </p>
        </footer>

      </div>
    </div>
  );
}
