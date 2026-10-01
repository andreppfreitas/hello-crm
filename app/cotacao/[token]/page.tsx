import { notFound } from "next/navigation";
import { dbGetQuotationByToken } from "@/lib/db/activity-db";
import { dbGetLead } from "@/lib/db/leads-db";
import { computeTotals, courseTotal, courseRemaining, fmt, estimateEndDate } from "@/lib/quotation";
import type { Quotation, QuotationCourse } from "@/types/quotation";
import { QuotationActions } from "./QuotationActions";

export const dynamic = "force-dynamic";

function dataBR(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
}

function Linha({ label, detail, value, destaque, desconto }: {
  label: string; detail?: string; value: string; destaque?: boolean; desconto?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-[var(--q-line)] last:border-0">
      <div className="min-w-0">
        <p className={destaque ? "font-semibold text-[var(--q-ink)]" : "text-[var(--q-ink-2)]"}>{label}</p>
        {detail && <p className="text-xs text-[var(--q-muted)] mt-0.5">{detail}</p>}
      </div>
      <p className={`tabular-nums whitespace-nowrap ${
        desconto ? "text-[var(--q-good)]" : destaque ? "font-bold text-[var(--q-ink)]" : "text-[var(--q-ink-2)]"
      }`}>{value}</p>
    </div>
  );
}

function CursoCard({ curso, indice, moeda }: { curso: QuotationCourse; indice: number; moeda: string }) {
  const total = courseTotal(curso);
  const fim = curso.endDate ?? (curso.startDate ? estimateEndDate(curso.startDate, curso.durationLabel) : undefined);

  return (
    <article className="q-card">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <p className="q-eyebrow">Curso {indice}</p>
          <h3 className="text-xl font-semibold text-[var(--q-ink)] mt-1">{curso.course || "Curso"}</h3>
          <p className="text-[var(--q-ink-2)] mt-0.5">{curso.school}</p>
        </div>
        <div className="text-right">
          <p className="q-eyebrow">Investimento</p>
          <p className="text-2xl font-bold text-[var(--q-ink)] tabular-nums mt-1">{fmt(total, moeda)}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          ["Duração", curso.durationLabel || "—"],
          ["Começa em", dataBR(curso.startDate)],
          ["Termina em", dataBR(fim)],
        ].map(([k, v]) => (
          <div key={k} className="q-chip">
            <p className="q-eyebrow">{k}</p>
            <p className="text-sm font-medium text-[var(--q-ink)] mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      <p className="q-eyebrow mb-1">O que está incluso neste valor</p>
      <div>
        {curso.fees.map((f, i) => (
          <Linha key={i} label={f.label} value={fmt(f.amount, moeda)} desconto={f.amount < 0} />
        ))}
      </div>

      {(curso.deposit > 0 || curso.installments.length > 0) && (
        <div className="mt-5 pt-4 border-t border-[var(--q-line)]">
          <p className="q-eyebrow mb-2">Como você paga este curso</p>
          {curso.deposit > 0 && (
            <Linha
              label="Entrada"
              detail="Pago agora para a escola emitir o seu CoE"
              value={fmt(curso.deposit, moeda)}
              destaque
            />
          )}
          {curso.installments.map((t, i) => (
            <Linha
              key={i}
              label={`${t.count}× de ${fmt(t.amount, moeda)}`}
              detail={i === 0 ? curso.installmentNote : undefined}
              value={fmt(t.count * t.amount, moeda)}
            />
          ))}
          {curso.installments.length > 0 && (
            <p className="text-xs text-[var(--q-muted)] mt-2">
              Saldo a parcelar: {fmt(courseRemaining(curso), moeda)}. As datas exatas de vencimento
              vêm na Carta de Oferta da escola.
            </p>
          )}
        </div>
      )}
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

  return (
    <div className="q-root">
      <div className="q-wrap">

        <header className="q-header">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="q-eyebrow">Hello Australia · Cotação {q.number}</p>
              <h1 className="q-title">{q.packageName}</h1>
              <p className="text-[var(--q-ink-2)] mt-1">{q.city}</p>
            </div>
            <QuotationActions />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              ["Preparada para", studentName ?? "—"],
              ["Seu consultor", q.createdBy],
              ["Emitida em", dataBR(q.createdAt.slice(0, 10))],
              ["Válida até", dataBR(q.validUntil)],
            ].map(([k, v]) => (
              <div key={k} className="q-chip">
                <p className="q-eyebrow">{k}</p>
                <p className="text-sm font-medium text-[var(--q-ink)] mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </header>

        {vencida && (
          <div className="q-alert q-alert-warn">
            <strong>Esta cotação expirou em {dataBR(q.validUntil)}.</strong> Os valores e as vagas
            podem ter mudado — fale com {q.createdBy} para receber uma atualizada.
          </div>
        )}

        {q.importantNote && (
          <div className="q-alert">
            <p className="q-eyebrow mb-1">Importante</p>
            <p className="whitespace-pre-wrap">{q.importantNote}</p>
          </div>
        )}

        {/* Resumo: a pergunta que o aluno faz primeiro é "quanto preciso agora?" */}
        <section className="q-summary">
          <div>
            <p className="q-eyebrow">Para começar o processo você paga agora</p>
            <p className="q-big">{fmt(t.upfrontTotal, q.currency)}</p>
            <p className="text-sm text-[var(--q-ink-2)] mt-1">
              {fmt(t.depositTotal, q.currency)} de entrada para a escola emitir o CoE
              {t.visaTotal > 0 && <> + {fmt(t.visaTotal, q.currency)} de custos do visto</>}
            </p>
          </div>
          <div className="q-summary-side">
            <Linha label="Total dos cursos" value={fmt(t.coursesTotal, q.currency)} />
            {t.visaTotal > 0 && <Linha label="Custos do visto" value={fmt(t.visaTotal, q.currency)} />}
            <Linha label="Investimento total" value={fmt(t.grandTotal, q.currency)} destaque />
            {t.remainingTotal > 0 && (
              <p className="text-xs text-[var(--q-muted)] mt-2">
                Depois da entrada, sobram {fmt(t.remainingTotal, q.currency)} que você parcela durante o curso.
              </p>
            )}
          </div>
        </section>

        <section className="q-section">
          <h2 className="q-h2">Seus cursos</h2>
          <div className="flex flex-col gap-4">
            {q.courses.map((c, i) => (
              <CursoCard key={c.id} curso={c} indice={i + 1} moeda={q.currency} />
            ))}
          </div>
        </section>

        {q.visaCosts.length > 0 && (
          <section className="q-section">
            <h2 className="q-h2">Custos do visto</h2>
            <p className="q-lede">
              Pagos ao governo australiano e à seguradora, no dia em que damos entrada no seu visto.
              Não são valores da escola nem da Hello.
            </p>
            <div className="q-card">
              {q.visaCosts.map((v, i) => (
                <Linha key={i} label={v.label} detail={v.detail} value={fmt(v.amount, q.currency)} />
              ))}
              <Linha label="Total" value={fmt(t.visaTotal, q.currency)} destaque />
            </div>
          </section>
        )}

        <section className="q-section">
          <h2 className="q-h2">Como funciona daqui para frente</h2>
          <ol className="q-steps">
            {[
              ["Você aprova esta cotação", `Responda para ${q.createdBy} confirmando o pacote escolhido.`],
              ["Paga a entrada", `${fmt(t.depositTotal, q.currency)} para a escola emitir o seu CoE, o documento que comprova a matrícula.`],
              ["Reunimos seus documentos", "Passaporte, extrato bancário, carta de intenção e o seguro saúde OSHC."],
              ["Damos entrada no visto", `Com os ${fmt(t.visaTotal, q.currency)} de custos do visto pagos no dia da aplicação.`],
              ["Você embarca", "Acompanhamos a análise da imigração e te avisamos a cada novidade."],
            ].map(([titulo, texto], i) => (
              <li key={i}>
                <span className="q-step-num">{i + 1}</span>
                <div>
                  <p className="font-semibold text-[var(--q-ink)]">{titulo}</p>
                  <p className="text-[var(--q-ink-2)] text-sm mt-0.5">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="q-footer">
          <p>
            Dúvida em qualquer ponto desta cotação? Fale com <strong>{q.createdBy}</strong> —
            é melhor perguntar antes de pagar qualquer coisa.
          </p>
          <p className="text-xs text-[var(--q-muted)] mt-2">
            Hello Australia · Cotação {q.number} · Valores em {q.currency}, sujeitos a alteração pela
            escola até a confirmação da matrícula.
          </p>
        </footer>

      </div>
    </div>
  );
}
