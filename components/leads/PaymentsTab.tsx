"use client";

import { useState } from "react";
import type { Lead, Payment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

/** Cobranças típicas do processo — atalho para não digitar sempre. */
const PRESETS = ["Depósito do CoE", "Tuition fee", "OSHC", "Taxa de visto", "Taxa da Hello", "Material didático"];

const STATUS_LABELS: Record<Payment["status"], string> = {
  pending: "Pendente",
  collected: "Recebido",
  overdue: "Atrasado",
};

interface Props {
  lead: Lead;
  onUpdate: (payments: Payment[]) => void;
}

export function PaymentsTab({ lead, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", amount: "", currency: "AUD", dueDate: "" });

  const payments = lead.payments ?? [];
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const collected = payments.filter((p) => p.status === "collected").reduce((s, p) => s + p.amount, 0);

  function addPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.label.trim()) { toast.error("Descreva a cobrança"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Valor inválido"); return; }

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      label: form.label.trim(),
      amount,
      currency: form.currency,
      status: "pending",
      dueDate: form.dueDate || undefined,
    };
    onUpdate([...payments, payment]);
    setForm({ label: "", amount: "", currency: form.currency, dueDate: "" });
    setShowForm(false);
    toast.success("Pagamento adicionado");
  }

  function setStatus(id: string, status: Payment["status"]) {
    onUpdate(payments.map((p) => p.id === id ? {
      ...p,
      status,
      paidAt: status === "collected" ? (p.paidAt ?? new Date().toISOString()) : undefined,
    } : p));
  }

  function remove(id: string) {
    if (!confirm("Remover este pagamento?")) return;
    onUpdate(payments.filter((p) => p.id !== id));
    toast.success("Pagamento removido");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold">Pagamentos</h3>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Cancelar" : "Adicionar"}
        </Button>
      </div>

      {payments.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(total, payments[0].currency)}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-xs text-emerald-300/70">Recebido</p>
            <p className="text-lg font-bold text-emerald-300">{formatCurrency(collected, payments[0].currency)}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={addPayment} className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm((f) => ({ ...f, label: p }))}
                className="text-[10px] px-2 py-1 rounded-md bg-secondary/50 border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <Input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Descrição da cobrança"
            className="bg-secondary/50"
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Valor"
              className="bg-secondary/50 col-span-1"
            />
            <select
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="bg-secondary border border-border rounded-lg px-2 py-2 text-sm text-foreground"
            >
              <option value="AUD">AUD</option>
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
            </select>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="bg-secondary/50"
            />
          </div>
          <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            Adicionar pagamento
          </Button>
        </form>
      )}

      {payments.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum pagamento registrado ainda.
        </p>
      )}

      <div className="space-y-2">
        {payments.map((pay) => {
          const overdue = pay.status === "pending" && pay.dueDate && new Date(pay.dueDate) < new Date();
          return (
            <div key={pay.id} className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2 group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{pay.label}</p>
                  {pay.dueDate && (
                    <p className={cn("text-xs", overdue ? "text-red-400" : "text-muted-foreground")}>
                      Vence {new Date(pay.dueDate).toLocaleDateString("pt-BR")}
                      {overdue && " · atrasado"}
                    </p>
                  )}
                  {pay.paidAt && (
                    <p className="text-xs text-emerald-400">
                      Pago em {new Date(pay.paidAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{formatCurrency(pay.amount, pay.currency)}</p>
                  <button
                    onClick={() => remove(pay.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-1">
                {(["pending", "collected", "overdue"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatus(pay.id, st)}
                    className={cn(
                      "flex-1 text-[10px] py-1 rounded-md border transition-colors",
                      pay.status === st
                        ? st === "collected" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                          : st === "overdue" ? "bg-red-500/20 border-red-500/40 text-red-300"
                          : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {STATUS_LABELS[st]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
