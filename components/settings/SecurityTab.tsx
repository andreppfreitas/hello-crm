"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, ShieldAlert, Eye, EyeOff, Loader2, Monitor, Smartphone, Tablet,
  LogOut, KeyRound, History, MapPin,
} from "lucide-react";

interface SessionInfo {
  id: string;
  device: string;
  os: string;
  browser: string;
  city: string;
  country: string;
  ip: string;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
}

interface HistoryEvent {
  label: string;
  at: string;
  city: string;
  country: string;
  device: string;
  browser: string;
  ip: string;
  result: "ok" | "fail";
}

interface Overview {
  status: "good" | "warning";
  warnings: string[];
  positives: string[];
  lastLogin: HistoryEvent | null;
  passwordChangedAt: string | null;
  passwordAgeDays: number | null;
  activeSessions: number;
  twoFactorEnabled: boolean;
  history: HistoryEvent[];
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Fraca", color: "bg-red-400" };
  if (score <= 3) return { score, label: "Média", color: "bg-amber-400" };
  return { score, label: "Forte", color: "bg-emerald-400" };
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const relative = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "Agora";
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `${days} dias atrás`;
};

const DeviceIcon = ({ device }: { device: string }) =>
  device.includes("Celular") ? <Smartphone className="w-4 h-4" /> :
  device.includes("Tablet") ? <Tablet className="w-4 h-4" /> :
  <Monitor className="w-4 h-4" />;

export function SecurityTab() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, sesRes] = await Promise.all([
        fetch("/api/security/overview"),
        fetch("/api/security/sessions"),
      ]);
      if (ovRes.ok) setOverview(await ovRes.json());
      if (sesRes.ok) setSessions((await sesRes.json()).sessions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    if (newPassword.length < 8) { toast.error("Nova senha deve ter pelo menos 8 caracteres"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao alterar senha"); return; }
      toast.success(
        data.revokedSessions > 0
          ? `Senha alterada. ${data.revokedSessions} outra(s) sessão(ões) encerrada(s).`
          : "Senha alterada com sucesso"
      );
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      load();
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  async function revokeSession(id: string) {
    const res = await fetch(`/api/security/sessions?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Sessão encerrada"); load(); }
    else toast.error("Erro ao encerrar sessão");
  }

  async function revokeOthers() {
    const res = await fetch("/api/security/sessions?others=1", { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      toast.success(`${data.revoked} sessão(ões) encerrada(s)`);
      load();
    } else toast.error("Erro ao encerrar sessões");
  }

  const strength = passwordStrength(newPassword);

  return (
    <div className="space-y-5">
      {/* Status da Segurança */}
      <div className={cn(
        "glass-card rounded-xl p-6 border",
        overview?.status === "good" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
      )}>
        <div className="flex items-center gap-3 mb-3">
          {overview?.status === "good"
            ? <ShieldCheck className="w-6 h-6 text-emerald-400" />
            : <ShieldAlert className="w-6 h-6 text-amber-400" />}
          <div>
            <h2 className="text-base font-semibold">Segurança da Conta</h2>
            <p className={cn("text-sm font-medium", overview?.status === "good" ? "text-emerald-400" : "text-amber-400")}>
              {loading ? "Verificando..." : overview?.status === "good" ? "🟢 Boa" : "🟠 Atenção"}
            </p>
          </div>
        </div>
        {!loading && overview && (
          <div className="space-y-1">
            {overview.positives.map((p) => (
              <p key={p as string} className="text-xs text-muted-foreground">✓ {p}</p>
            ))}
            {overview.warnings.map((w) => (
              <p key={w} className="text-xs text-amber-400">⚠ {w}</p>
            ))}
          </div>
        )}
      </div>

      {/* Último Login + Última alteração de senha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold">Último Login</h3>
          </div>
          {overview?.lastLogin ? (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="text-sm text-foreground font-medium">{fmtDate(overview.lastLogin.at)}</p>
              <p>{overview.lastLogin.browser} · {overview.lastLogin.device}</p>
              <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {overview.lastLogin.city}, {overview.lastLogin.country} · {overview.lastLogin.ip}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{loading ? "Carregando..." : "Nenhum login registrado ainda."}</p>
          )}
        </div>

        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold">Última alteração de senha</h3>
          </div>
          {overview?.passwordChangedAt ? (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="text-sm text-foreground font-medium">
                Alterada {overview.passwordAgeDays === 0 ? "hoje" : `${overview.passwordAgeDays} dias atrás`}
              </p>
              <p>{fmtDate(overview.passwordChangedAt)}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{loading ? "Carregando..." : "Senha criada no cadastro inicial"}</p>
          )}
        </div>
      </div>

      {/* Alterar Senha */}
      <div className="glass-card rounded-xl p-6 space-y-5">
        <h2 className="text-base font-semibold">Alterar Senha</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Senha atual</Label>
            <Input type={showPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-secondary/50" placeholder="••••••••" autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nova senha</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-secondary/50 pr-10" placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", strength.color)} style={{ width: `${(strength.score / 5) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-12">{strength.label}</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Confirmar nova senha</Label>
            <Input type={showPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-secondary/50" placeholder="••••••••" autoComplete="new-password" />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-400">As senhas não coincidem</p>
            )}
          </div>
          <Button type="submit" disabled={saving || !currentPassword || !newPassword || !confirmPassword} className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar nova senha"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Ao alterar a senha, todas as outras sessões serão encerradas e você receberá um e-mail de confirmação.
          </p>
        </form>
      </div>

      {/* Sessões Ativas */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-semibold">Sessões Ativas</h2>
          {sessions.length > 1 && (
            <Button size="sm" variant="outline" onClick={revokeOthers} className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Encerrar todas as outras
            </Button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma sessão encontrada.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                s.current ? "bg-primary/5 border-primary/30" : "bg-secondary/30 border-border"
              )}>
                <div className={cn("p-2 rounded-lg flex-shrink-0", s.current ? "bg-primary/15 text-primary" : "bg-white/5 text-muted-foreground")}>
                  <DeviceIcon device={s.device} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.browser} · {s.os}
                    {s.current && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Sessão Atual</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.city}, {s.country} · {s.ip} · {relative(s.lastSeenAt)}
                  </p>
                </div>
                {!s.current && (
                  <Button size="sm" variant="ghost" onClick={() => revokeSession(s.id)} className="text-destructive hover:bg-destructive/10 h-8 px-2.5 text-xs flex-shrink-0">
                    Encerrar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de acessos */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold">Histórico de acessos</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !overview?.history.length ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="space-y-1">
            {overview.history.map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", e.result === "ok" ? "bg-emerald-400" : "bg-red-400")} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{e.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {e.city}, {e.country} · {e.device} · {e.browser} · {e.ip}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground flex-shrink-0">{fmtDate(e.at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2FA info */}
      <div className="glass-card rounded-xl p-6 space-y-2">
        <h2 className="text-base font-semibold">Verificação em duas etapas</h2>
        {overview?.twoFactorEnabled ? (
          <p className="text-sm text-muted-foreground">
            ✅ Ativa via <span className="text-foreground font-medium">código por e-mail</span>. A cada novo login você recebe um código de 6 dígitos.
            Dispositivos confiáveis ficam liberados por 30 dias.
          </p>
        ) : (
          <p className="text-sm text-amber-400">
            ⚠ Verificação por e-mail não configurada. Defina as variáveis <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">RESEND_API_KEY</code> e{" "}
            <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">SECURITY_EMAIL_FROM</code> no ambiente para ativar.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Em breve: Google/Microsoft Authenticator, Passkeys e biometria — a arquitetura já está preparada.
        </p>
      </div>
    </div>
  );
}
