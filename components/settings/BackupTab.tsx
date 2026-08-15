"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Upload, Loader2, ShieldCheck } from "lucide-react";

/**
 * Backup completo do sistema.
 * A restauração só adiciona e sobrescreve por id — nunca apaga — então
 * restaurar um arquivo antigo não destrói o que foi criado depois dele.
 */
export function BackupTab({ isAdmin }: { isAdmin: boolean }) {
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function baixar() {
    setBusy("export");
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        toast.error(res.status === 403 ? "Só administradores podem baixar o backup" : "Erro ao gerar o backup");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hello-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup baixado");
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setBusy(null);
    }
  }

  async function restaurar(file: File) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      toast.error("Arquivo não é um JSON válido");
      return;
    }
    const counts = (parsed as { counts?: { leads?: number } })?.counts;
    const quantos = counts?.leads ?? "?";
    if (!confirm(
      `Restaurar este backup?\n\n${quantos} aluno(s) serão adicionados ou atualizados.\n` +
      `Nada é apagado: registros criados depois deste backup permanecem.`
    )) return;

    setBusy("import");
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao restaurar"); return; }
      toast.success(
        `Restaurado: ${data.restored.leads} aluno(s), ${data.restored.reminders} lembrete(s)` +
        (data.restored.ignorados ? ` · ${data.restored.ignorados} registro(s) inválido(s) ignorado(s)` : "")
      );
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 flex-shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Backup completo</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Um arquivo JSON com alunos, lembretes, comissões, histórico de contato, templates e
            passos do processo. O banco vive num Redis só — sem cópia, uma perda é definitiva.
          </p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button size="sm" onClick={baixar} disabled={!isAdmin || busy !== null}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
          {busy === "export" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Baixar backup
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) restaurar(f);
          }}
        />
        <Button size="sm" variant="outline" disabled={!isAdmin || busy !== null}
          onClick={() => fileRef.current?.click()} className="gap-1.5">
          {busy === "import" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Restaurar de um arquivo
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        A restauração <strong className="text-foreground">nunca apaga</strong>: ela adiciona o que falta e
        atualiza o que tem o mesmo id. Senhas não entram no backup.
      </p>

      {!isAdmin && <p className="text-xs text-amber-400">Só administradores podem baixar ou restaurar.</p>}
    </div>
  );
}
