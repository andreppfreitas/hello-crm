"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, Search, Bell, LogOut, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_TITLES_PT: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/leads/new": "Novo Lead",
  "/reports": "Relatórios",
  "/settings": "Configurações",
  "/reminders": "Lembretes",
  "/briefing": "Briefing",
  "/import": "Importar CSV",
};

const PAGE_TITLES_EN: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/leads/new": "New Lead",
  "/reports": "Reports",
  "/settings": "Settings",
  "/reminders": "Reminders",
  "/briefing": "Briefing",
  "/import": "Import CSV",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const PAGE_TITLES = language === "pt" ? PAGE_TITLES_PT : PAGE_TITLES_EN;
  const title =
    Object.entries(PAGE_TITLES).find(
      ([path]) =>
        pathname === path ||
        (path !== "/leads/new" && path !== "/" && pathname.startsWith(path))
    )?.[1] ?? "Hello CRM";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function toggleLanguage() {
    const next = language === "pt" ? "en" : "pt";
    setLanguage(next);
    toast.success(next === "pt" ? "Idioma: Português" : "Language: English");
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                router.push(`/leads?q=${encodeURIComponent(search.trim())}`);
                setSearch("");
              }
            }}
            className="pl-9 w-52 bg-secondary/50 border-border text-sm"
          />
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="h-7 px-2.5 rounded-lg text-xs font-semibold border border-border bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          {language === "pt" ? "🇧🇷 PT" : "🇦🇺 EN"}
        </button>

        {/* Bell */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        {/* New Lead */}
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[0.8rem] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          {t("newLead")}
        </Link>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 h-8 pl-2 pr-2.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              A
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 glass-card rounded-xl border border-border shadow-xl overflow-hidden z-50">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-medium text-foreground">André Perez</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                {t("settings")}
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t("logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
