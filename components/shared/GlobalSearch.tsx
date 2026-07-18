"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCRM } from "@/contexts/CRMContext";
import { STAGE_CONFIG } from "@/lib/constants";
import { initials, cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const { leads } = useCRM();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const q = query.toLowerCase().trim();
  const results = q.length < 1 ? [] : leads
    .filter((l) =>
      l.fullName.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
    )
    .slice(0, 8);

  function go(id: string) {
    router.push(`/leads/${id}`);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && results[cursor]) go(results[cursor].id);
  }

  return (
    <>
      {/* Trigger button shown in Header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Buscar lead...</span>
        <kbd className="hidden md:inline text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg mx-4 glass-card rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
                onKeyDown={onKeyDown}
                placeholder="Buscar por nome, email ou telefone..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="py-1.5 max-h-80 overflow-y-auto">
                {results.map((lead, i) => (
                  <button
                    key={lead.id}
                    onClick={() => go(lead.id)}
                    onMouseEnter={() => setCursor(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                      cursor === i ? "bg-white/8" : "hover:bg-white/5"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {initials(lead.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {STAGE_CONFIG[lead.stage]?.label ?? lead.stage} · {lead.assignedConsultant.split(" ")[0]}
                      </p>
                    </div>
                    <TemperatureBadge temp={lead.temperature} className="text-[10px] px-1.5 py-0.5" />
                  </button>
                ))}
              </div>
            )}

            {q.length > 0 && results.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum lead encontrado para "{query}"
              </div>
            )}

            {q.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Digite para buscar
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
