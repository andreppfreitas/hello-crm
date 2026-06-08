"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONSULTANTS, CITIES } from "@/lib/constants";
import { toast } from "sonner";
import { User, Building2, Bell, Palette, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

const SECTIONS = ["Perfil", "Agência", "Notificações", "Aparência", "Dados"] as const;
type Section = typeof SECTIONS[number];

const ICONS: Record<Section, React.ElementType> = {
  Perfil: User,
  Agência: Building2,
  Notificações: Bell,
  Aparência: Palette,
  Dados: Database,
};

const THEMES: { id: Theme; label: string; preview: string }[] = [
  { id: "dark-navy", label: "Dark Navy", preview: "bg-[oklch(0.13_0.02_250)]" },
  { id: "dark-gray", label: "Dark Cinza", preview: "bg-[oklch(0.14_0.005_260)]" },
  { id: "deep-black", label: "Deep Black", preview: "bg-[oklch(0.07_0.005_260)]" },
  { id: "light", label: "Claro", preview: "bg-[oklch(0.97_0.005_250)]" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("Perfil");
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [profile, setProfile] = useState({
    name: "André Perez",
    email: "andre@helloaustralia.com.au",
    role: "Senior Consultant",
    phone: "+61 400 000 000",
  });

  function handleSave() {
    toast.success("Configurações salvas");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-48 flex-shrink-0">
          <div className="glass-card rounded-xl p-2 space-y-1">
            {SECTIONS.map((section) => {
              const Icon = ICONS[section];
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    activeSection === section
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {section}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">
          {activeSection === "Perfil" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">Perfil</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                  <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">E-mail</Label>
                  <Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cargo</Label>
                  <Input value={profile.role} onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className="bg-secondary/50" />
                </div>
              </div>
              <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">Salvar</Button>
            </div>
          )}

          {activeSection === "Agência" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">Configuração da Agência</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Consultores</p>
                  <div className="space-y-1.5">
                    {CONSULTANTS.map((c) => (
                      <div key={c} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 text-sm">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-xs">
                          {c.split(" ").map((w) => w[0]).join("")}
                        </div>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cidades</p>
                  <div className="flex flex-wrap gap-2">
                    {CITIES.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-full text-xs bg-secondary/50 border border-border text-foreground">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "Notificações" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">Preferências de Notificação</h2>
              <div className="space-y-3">
                {[
                  ["Lembretes de tarefas", true],
                  ["Novo lead atribuído", true],
                  ["Mudanças de etapa", false],
                  ["Lembretes de pagamento", true],
                  ["Alertas de prazo de visto", true],
                ].map(([label, defaultOn]) => (
                  <div key={String(label)} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm">{String(label)}</span>
                    <div className={cn("w-10 h-5 rounded-full transition-colors cursor-pointer", defaultOn ? "bg-primary" : "bg-muted")} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "Aparência" && (
            <div className="space-y-5">
              {/* Theme */}
              <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-base font-semibold">{t("theme")}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((th) => (
                    <button
                      key={th.id}
                      onClick={() => {
                        setTheme(th.id);
                        toast.success(`Tema "${th.label}" aplicado`);
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        theme === th.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-foreground/30 bg-secondary/20"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg border border-white/10", th.preview)} />
                      <div>
                        <p className="text-sm font-medium">{th.label}</p>
                        {theme === th.id && <p className="text-xs text-primary">Ativo</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-base font-semibold">{t("language")}</h2>
                <div className="flex gap-3">
                  {([
                    { id: "pt" as Language, label: "🇧🇷 Português", desc: "Interface em português" },
                    { id: "en" as Language, label: "🇦🇺 English", desc: "Interface in English" },
                  ]).map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setLanguage(lang.id);
                        toast.success(`Idioma alterado`);
                      }}
                      className={cn(
                        "flex-1 p-3 rounded-xl border-2 transition-all text-left",
                        language === lang.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-foreground/30 bg-secondary/20"
                      )}
                    >
                      <p className="text-sm font-medium">{lang.label}</p>
                      <p className="text-xs text-muted-foreground">{lang.desc}</p>
                      {language === lang.id && <p className="text-xs text-primary mt-1">Ativo</p>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "Dados" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">Dados do Sistema</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Armazenamento", "In-memory (demo)"],
                  ["Total de Leads", "50 seed + criados"],
                  ["Modo", "Mock data store"],
                  ["Versão", "1.0.0"],
                ].map(([label, value]) => (
                  <div key={String(label)} className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">{String(label)}</p>
                    <p className="font-medium mt-0.5">{String(value)}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => toast.info("Export em breve")}>Exportar CSV</Button>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => toast.error("Reset cancelado")}>
                  Reset Dados
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
