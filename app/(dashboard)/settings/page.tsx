"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONSULTANTS, CITIES } from "@/lib/constants";
import { toast } from "sonner";
import { User, Building2, Bell, Palette, Database, Lock, Users, MessageCircle, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import type { CustomTemplate } from "@/types";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { SecurityTab } from "@/components/settings/SecurityTab";

const SECTIONS_PT = ["Perfil", "Segurança", "Usuários", "Agência", "Notificações", "Aparência", "Templates", "Dados"] as const;
const SECTIONS_EN = ["Profile", "Security", "Users", "Agency", "Notifications", "Appearance", "Templates", "Data"] as const;
type SectionPT = typeof SECTIONS_PT[number];
type SectionEN = typeof SECTIONS_EN[number];
type Section = SectionPT;

const ICONS: Record<Section, React.ElementType> = {
  Perfil: User,
  Segurança: Lock,
  Usuários: Users,
  Agência: Building2,
  Notificações: Bell,
  Aparência: Palette,
  Templates: MessageCircle,
  Dados: Database,
};

const THEMES: { id: Theme; labelPt: string; labelEn: string; preview: string }[] = [
  { id: "dark-navy", labelPt: "Dark Navy", labelEn: "Dark Navy", preview: "bg-[oklch(0.13_0.02_250)]" },
  { id: "dark-gray", labelPt: "Dark Cinza", labelEn: "Dark Gray", preview: "bg-[oklch(0.14_0.005_260)]" },
  { id: "deep-black", labelPt: "Deep Black", labelEn: "Deep Black", preview: "bg-[oklch(0.07_0.005_260)]" },
  { id: "light", labelPt: "Claro", labelEn: "Light", preview: "bg-[oklch(0.97_0.005_250)]" },
];

type OfficeCity = "Sydney" | "Melbourne" | "Brisbane" | "Gold Coast" | "Perth" | "Adelaide";
const OFFICES: OfficeCity[] = ["Sydney", "Melbourne", "Brisbane", "Gold Coast", "Perth", "Adelaide"];

interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "consultant";
  office?: OfficeCity;
  createdAt: string;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("Perfil");
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user: me } = useAuth();

  const SECTIONS = language === "en" ? SECTIONS_EN : SECTIONS_PT;
  const SECTION_MAP: Record<string, Section> = language === "en"
    ? { "Profile": "Perfil", "Security": "Segurança", "Users": "Usuários", "Agency": "Agência", "Notifications": "Notificações", "Appearance": "Aparência", "Templates": "Templates", "Data": "Dados" }
    : { "Perfil": "Perfil", "Segurança": "Segurança", "Usuários": "Usuários", "Agência": "Agência", "Notificações": "Notificações", "Aparência": "Aparência", "Templates": "Templates", "Dados": "Dados" };

  const [profile, setProfile] = useState({
    name: "André Perez",
    email: "andre@helloaustralia.com.au",
    role: "Senior Consultant",
    phone: "+61 400 000 000",
  });

  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ displayName: "", username: "", password: "", role: "consultant" as "admin" | "consultant", office: "Sydney" as OfficeCity });
  const [savingNewUser, setSavingNewUser] = useState(false);

  // ── Custom Templates ─────────────────────────────────────────────────────────
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [newTpl, setNewTpl] = useState({ label: "", channel: "whatsapp" as "whatsapp" | "email", subject: "", body: "" });
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [editTpl, setEditTpl] = useState({ label: "", channel: "whatsapp" as "whatsapp" | "email", subject: "", body: "" });

  async function loadTemplates() {
    setTplLoading(true);
    fetch("/api/templates").then(r => r.json()).then(d => { setCustomTemplates(d.templates ?? []); setTplLoading(false); }).catch(() => setTplLoading(false));
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTpl.label || !newTpl.body) { toast.error("Preencha nome e corpo do template"); return; }
    const res = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newTpl) });
    if (res.ok) { toast.success("Template criado"); setShowNewTpl(false); setNewTpl({ label: "", channel: "whatsapp", subject: "", body: "" }); loadTemplates(); }
    else toast.error("Erro ao criar template");
  }

  async function handleDeleteTemplate(id: string) {
    const res = await fetch("/api/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) { toast.success("Template removido"); loadTemplates(); }
  }

  async function handleUpdateTemplate(id: string) {
    const res = await fetch("/api/templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...editTpl }) });
    if (res.ok) { toast.success("Template atualizado"); setEditingTplId(null); loadTemplates(); }
  }

  useEffect(() => {
    if (activeSection === "Templates") loadTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const [notifPrefs, setNotifPrefs] = useState({
    taskReminders: true,
    newLeadAssigned: true,
    stageChanges: false,
    paymentReminders: true,
    visaAlerts: true,
  });

  function handleSave() {
    toast.success(language === "en" ? "Settings saved" : "Configurações salvas");
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users ?? []);
      }
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    if ((activeSection === "Usuários" || activeSection === "Agência") && me?.role === "admin") {
      loadUsers();
    }
  }, [activeSection, me]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.displayName || !newUser.username || !newUser.password) {
      toast.error(language === "en" ? "Fill all fields" : "Preencha todos os campos");
      return;
    }
    setSavingNewUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? (language === "en" ? "Error creating user" : "Erro ao criar usuário"));
      } else {
        toast.success(language === "en" ? "User created" : "Usuário criado com sucesso");
        setShowNewUserForm(false);
        setNewUser({ displayName: "", username: "", password: "", role: "consultant", office: "Sydney" });
        loadUsers();
      }
    } catch {
      toast.error(language === "en" ? "Error creating user" : "Erro ao criar usuário");
    } finally {
      setSavingNewUser(false);
    }
  }

  async function handleRoleChange(userId: string, role: "admin" | "consultant") {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) { toast.success(language === "en" ? "Role updated" : "Papel atualizado"); loadUsers(); }
      else { toast.error(language === "en" ? "Error updating role" : "Erro ao atualizar papel"); }
    } catch { toast.error(language === "en" ? "Error updating role" : "Erro ao atualizar papel"); }
  }

  async function handleDeleteUser(userId: string, displayName: string) {
    if (!confirm(`${language === "en" ? "Delete" : "Excluir"} ${displayName}?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`${displayName} ${language === "en" ? "deleted" : "excluído"}`);
        loadUsers();
      } else {
        const data = await res.json();
        toast.error(data.error ?? (language === "en" ? "Error deleting" : "Erro ao excluir"));
      }
    } catch { toast.error(language === "en" ? "Error deleting user" : "Erro ao excluir usuário"); }
  }

  const visibleSections = SECTIONS.filter((s) => {
    const key = SECTION_MAP[s] ?? s;
    if (key === "Usuários") return me?.role === "admin";
    return true;
  });

  const activeSectionLabel = language === "en"
    ? (Object.entries(SECTION_MAP).find(([, v]) => v === activeSection)?.[0] ?? activeSection)
    : activeSection;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mobile: horizontal scrolling pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 md:hidden scrollbar-thin">
        {visibleSections.map((section) => {
          const key = SECTION_MAP[section] ?? section as Section;
          const Icon = ICONS[key];
          const isActive = key === activeSection;
          return (
            <button
              key={section}
              onClick={() => setActiveSection(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 min-h-[44px]",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {section}
            </button>
          );
        })}
      </div>

      <div className="flex gap-6">
        {/* Desktop: sidebar nav */}
        <div className="hidden md:block w-48 flex-shrink-0">
          <div className="glass-card rounded-xl p-2 space-y-1">
            {visibleSections.map((section) => {
              const key = SECTION_MAP[section] ?? section as Section;
              const Icon = ICONS[key];
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(key)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    key === activeSection
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
        <div className="flex-1 min-w-0 space-y-5">
          {activeSection === "Perfil" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">{t("profile")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("fullName")}</Label>
                  <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("email")}</Label>
                  <Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{language === "en" ? "Role" : "Cargo"}</Label>
                  <Input value={profile.role} onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))} className="bg-secondary/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("phone")}</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className="bg-secondary/50" />
                </div>
              </div>
              <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">{t("save")}</Button>
            </div>
          )}

          {activeSection === "Segurança" && <SecurityTab />}

          {activeSection === "Usuários" && me?.role === "admin" && (
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">{language === "en" ? "System Users" : "Usuários do Sistema"}</h2>
                  <Button size="sm" onClick={() => setShowNewUserForm((v) => !v)} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
                    + {language === "en" ? "New User" : "Novo Usuário"}
                  </Button>
                </div>

                {showNewUserForm && (
                  <form onSubmit={handleCreateUser} className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                    <p className="text-sm font-medium">{language === "en" ? "New User" : "Novo Usuário"}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("fullName")}</Label>
                        <Input value={newUser.displayName} onChange={(e) => setNewUser((u) => ({ ...u, displayName: e.target.value }))} className="bg-secondary/50" placeholder="Ex: Maria Silva" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Username</Label>
                        <Input value={newUser.username} onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))} className="bg-secondary/50" placeholder="Ex: mariasilva" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{language === "en" ? "Temporary password" : "Senha temporária"}</Label>
                        <Input type="password" value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} className="bg-secondary/50" placeholder="••••••••" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{language === "en" ? "Role" : "Papel"}</Label>
                        <select value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value as "admin" | "consultant" }))} className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                          <option value="consultant">{language === "en" ? "Consultant" : "Consultor"}</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Office</Label>
                        <select value={newUser.office} onChange={(e) => setNewUser((u) => ({ ...u, office: e.target.value as OfficeCity }))} className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                          {OFFICES.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={savingNewUser} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        {savingNewUser ? t("loading") : (language === "en" ? "Create User" : "Criar Usuário")}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowNewUserForm(false)}>{t("cancel")}</Button>
                    </div>
                  </form>
                )}

                {usersLoading ? (
                  <p className="text-sm text-muted-foreground">{t("loading")}</p>
                ) : (
                  <div className="space-y-2">
                    {usersList.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                            {u.displayName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.displayName}</p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as "admin" | "consultant")}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full border font-medium bg-transparent focus:outline-none cursor-pointer",
                              u.role === "admin"
                                ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
                                : "border-blue-500/40 text-blue-400 bg-blue-500/10"
                            )}
                          >
                            <option value="admin">Admin</option>
                            <option value="consultant">{language === "en" ? "Consultant" : "Consultor"}</option>
                          </select>
                          {u.id !== me.id && (
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs" onClick={() => handleDeleteUser(u.id, u.displayName)}>
                              {t("delete")}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "Agência" && (
            <div className="space-y-5">
              <div className="glass-card rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">{language === "en" ? "Hello Australia Team" : "Equipe Hello Australia"}</h2>
                  <span className="text-xs text-muted-foreground">{usersList.length} {language === "en" ? "members" : "membros"}</span>
                </div>
                {usersLoading ? (
                  <p className="text-sm text-muted-foreground">{t("loading")}</p>
                ) : (
                  <div className="space-y-2">
                    {usersList.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {u.displayName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{u.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.username}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {me?.role === "admin" ? (
                            <select
                              value={u.office ?? ""}
                              onChange={async (e) => {
                                const office = e.target.value as OfficeCity;
                                await fetch(`/api/users/${u.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ office }) });
                                setUsersList((prev) => prev.map((x) => x.id === u.id ? { ...x, office } : x));
                                toast.success("Office atualizado");
                              }}
                              className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                            >
                              <option value="">— Office —</option>
                              {OFFICES.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            u.office && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">{u.office}</span>
                            )
                          )}
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", u.role === "admin" ? "bg-primary/15 text-primary border border-primary/20" : "bg-secondary text-muted-foreground border border-border")}>
                            {u.role === "admin" ? "Admin" : (language === "en" ? "Consultant" : "Consultor")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="glass-card rounded-xl p-6 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{language === "en" ? "Active offices" : "Offices ativos"}</p>
                <div className="flex flex-wrap gap-2">
                  {OFFICES.map((o) => {
                    const count = usersList.filter((u) => u.office === o).length;
                    return count > 0 ? (
                      <span key={o} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-secondary/50 border border-border">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                        {o} <span className="text-muted-foreground">({count})</span>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === "Notificações" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">{language === "en" ? "Notification Preferences" : "Preferências de Notificação"}</h2>
              <div className="space-y-3">
                {([
                  { key: "taskReminders",    labelPt: "Lembretes de tarefas",     labelEn: "Task reminders" },
                  { key: "newLeadAssigned",  labelPt: "Novo lead atribuído",       labelEn: "New lead assigned" },
                  { key: "stageChanges",     labelPt: "Mudanças de etapa",         labelEn: "Stage changes" },
                  { key: "paymentReminders", labelPt: "Lembretes de pagamento",    labelEn: "Payment reminders" },
                  { key: "visaAlerts",       labelPt: "Alertas de prazo de visto", labelEn: "Visa deadline alerts" },
                ] as { key: keyof typeof notifPrefs; labelPt: string; labelEn: string }[]).map(({ key, labelPt, labelEn }) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm">{language === "en" ? labelEn : labelPt}</span>
                    <button
                      onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}
                      className={cn("relative w-10 h-5 rounded-full transition-colors focus:outline-none", notifPrefs[key] ? "bg-primary" : "bg-muted")}
                    >
                      <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", notifPrefs[key] ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{language === "en" ? "Preferences are saved locally on this device." : "As preferências são salvas localmente neste dispositivo."}</p>
            </div>
          )}

          {activeSection === "Aparência" && (
            <div className="space-y-5">
              <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-base font-semibold">{t("theme")}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((th) => (
                    <button
                      key={th.id}
                      onClick={() => { setTheme(th.id); toast.success(`${language === "en" ? "Theme" : "Tema"} "${language === "en" ? th.labelEn : th.labelPt}" ${language === "en" ? "applied" : "aplicado"}`); }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        theme === th.id ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30 bg-secondary/20"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg border border-white/10", th.preview)} />
                      <div>
                        <p className="text-sm font-medium">{language === "en" ? th.labelEn : th.labelPt}</p>
                        {theme === th.id && <p className="text-xs text-primary">{language === "en" ? "Active" : "Ativo"}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-base font-semibold">{t("language")}</h2>
                <div className="flex gap-3">
                  {([
                    { id: "pt" as Language, label: "🇧🇷 Português", desc: "Interface em português" },
                    { id: "en" as Language, label: "🇦🇺 English", desc: "Interface in English" },
                  ]).map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => { setLanguage(lang.id); toast.success("Idioma alterado"); }}
                      className={cn(
                        "flex-1 p-3 rounded-xl border-2 transition-all text-left",
                        language === lang.id ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30 bg-secondary/20"
                      )}
                    >
                      <p className="text-sm font-medium">{lang.label}</p>
                      <p className="text-xs text-muted-foreground">{lang.desc}</p>
                      {language === lang.id && <p className="text-xs text-primary mt-1">{language === "en" ? "Active" : "Ativo"}</p>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "Templates" && (
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Templates Personalizados</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Templates globais disponíveis em todas as leads (WhatsApp e e-mail)</p>
                  </div>
                  {me?.role === "admin" && (
                    <Button size="sm" onClick={() => setShowNewTpl(true)} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Novo Template
                    </Button>
                  )}
                </div>

                {/* New template form */}
                {showNewTpl && (
                  <form onSubmit={handleCreateTemplate} className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                    <h3 className="text-sm font-semibold">Novo Template</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Nome do template</label>
                        <Input value={newTpl.label} onChange={e => setNewTpl(t => ({...t, label: e.target.value}))} placeholder="Ex: Follow-up pós reunião" className="bg-secondary/50" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Canal</label>
                        <select value={newTpl.channel} onChange={e => setNewTpl(t => ({...t, channel: e.target.value as "whatsapp"|"email"}))} className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none">
                          <option value="whatsapp">📱 WhatsApp</option>
                          <option value="email">📧 E-mail</option>
                        </select>
                      </div>
                    </div>
                    {newTpl.channel === "email" && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Assunto</label>
                        <Input value={newTpl.subject} onChange={e => setNewTpl(t => ({...t, subject: e.target.value}))} placeholder="Assunto do e-mail" className="bg-secondary/50" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Mensagem — use {"{name}"}, {"{course}"}, {"{city}"}, {"{consultant}"}</label>
                      <textarea value={newTpl.body} onChange={e => setNewTpl(t => ({...t, body: e.target.value}))} rows={4} placeholder="Olá {name}! ..." className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">Salvar</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowNewTpl(false)}>Cancelar</Button>
                    </div>
                  </form>
                )}

                {tplLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
                {!tplLoading && customTemplates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum template personalizado ainda</p>
                    <p className="text-xs mt-0.5">Templates por estágio já vêm pré-configurados no sistema</p>
                  </div>
                )}

                <div className="space-y-3">
                  {customTemplates.map(tpl => (
                    <div key={tpl.id} className="border border-border rounded-xl p-4 space-y-2">
                      {editingTplId === tpl.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Input value={editTpl.label} onChange={e => setEditTpl(t => ({...t, label: e.target.value}))} className="bg-secondary/50 text-sm" />
                            <select value={editTpl.channel} onChange={e => setEditTpl(t => ({...t, channel: e.target.value as "whatsapp"|"email"}))} className="bg-secondary/50 border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none">
                              <option value="whatsapp">📱 WhatsApp</option>
                              <option value="email">📧 E-mail</option>
                            </select>
                          </div>
                          <textarea value={editTpl.body} onChange={e => setEditTpl(t => ({...t, body: e.target.value}))} rows={3} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary/50" />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateTemplate(tpl.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"><Check className="w-3 h-3" /> Salvar</button>
                            <button onClick={() => setEditingTplId(null)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"><X className="w-3 h-3" /> Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={cn("p-1 rounded-md text-xs", tpl.channel === "whatsapp" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400")}>
                                {tpl.channel === "whatsapp" ? "📱" : "📧"}
                              </span>
                              <span className="text-sm font-medium">{tpl.label}</span>
                            </div>
                            {me?.role === "admin" && (
                              <div className="flex gap-1">
                                <button onClick={() => { setEditingTplId(tpl.id); setEditTpl({ label: tpl.label, channel: tpl.channel, subject: tpl.subject ?? "", body: tpl.body }); }} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground bg-background/50 rounded-lg p-2.5 whitespace-pre-wrap leading-relaxed line-clamp-3">{tpl.body}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "Dados" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold">{language === "en" ? "System Data" : "Dados do Sistema"}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {([
                  [language === "en" ? "Storage" : "Armazenamento", "Upstash Redis"],
                  [language === "en" ? "Mode" : "Modo", language === "en" ? "Production" : "Produção"],
                  [language === "en" ? "Version" : "Versão", "1.0.0"],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => toast.info(language === "en" ? "Export coming soon" : "Export em breve")}>{t("export")} CSV</Button>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => toast.error(language === "en" ? "Reset cancelled" : "Reset cancelado")}>
                  Reset {language === "en" ? "Data" : "Dados"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
