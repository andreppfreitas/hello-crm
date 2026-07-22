"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";

  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // etapa de verificação
  const [pendingId, setPendingId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== "verify" || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, resendIn]);

  useEffect(() => {
    if (step === "verify") codeRef.current?.focus();
  }, [step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao fazer login");
        return;
      }
      if (data.step === "verify") {
        setPendingId(data.pendingId);
        setMaskedEmail(data.maskedEmail);
        setStep("verify");
        setResendIn(60);
        setCode("");
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId, code, trustDevice }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Código inválido");
        if (data.reason === "expired" || data.reason === "used" || data.reason === "locked") {
          setTimeout(() => { setStep("credentials"); setError(""); }, 2500);
        }
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao reenviar");
        return;
      }
      setInfo("Código reenviado. Confira seu e-mail.");
      setResendIn(60);
      setCode("");
    } catch {
      setError("Erro de conexão.");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hello-logo.png" alt="Hello Australia" className="h-20 sm:h-28 w-auto" />
          <p className="text-sm text-muted-foreground">Sistema interno de gestão de leads</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {step === "credentials" ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Entrar na sua conta</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Acesso exclusivo para consultores Hello Australia</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Usuário</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="username"
                    autoFocus
                    className="bg-secondary/50 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Senha</label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="bg-secondary/50 h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/15 text-primary flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Verificação de Segurança</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Enviamos um código para <span className="text-foreground font-medium">{maskedEmail}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Digite o código de 6 dígitos</label>
                  <Input
                    ref={codeRef}
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="______"
                    className="bg-secondary/50 h-12 text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-[var(--primary)]"
                  />
                  <span className="text-sm text-muted-foreground">Confiar neste dispositivo por 30 dias</span>
                </label>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                {info && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-sm text-emerald-400">{info}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar"}
                </Button>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setStep("credentials"); setError(""); setInfo(""); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                  </button>
                  {resendIn > 0 ? (
                    <span className="text-xs text-muted-foreground">Reenviar em {resendIn}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-xs text-primary hover:underline"
                    >
                      Reenviar código
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">O código expira em 5 minutos.</p>
              </form>
            </>
          )}

          {step === "credentials" && (
            <p className="text-xs text-center text-muted-foreground">
              Problemas para acessar? Fale com o administrador do sistema.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Hello Australia CRM · v1.0 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
