"use client";

import { useState } from "react";
import { useCRM } from "@/contexts/CRMContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { X, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Reminder } from "@/types";
import { CONSULTANTS } from "@/lib/constants";

interface ReminderModalProps {
  leadId: string;
  leadName: string;
  open: boolean;
  onClose: () => void;
}

const QUICK_OPTIONS = [
  { label: "Amanhã", days: 1 },
  { label: "Em 2 dias", days: 2 },
  { label: "Em 3 dias", days: 3 },
  { label: "Em 1 semana", days: 7 },
];

export function ReminderModal({ leadId, leadName, open, onClose }: ReminderModalProps) {
  const { addReminder } = useCRM();
  const [type, setType] = useState<Reminder["type"]>("call");
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");

  function setQuickDate(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueAt(d.toISOString().slice(0, 16));
  }

  function handleSave() {
    if (!dueAt) { toast.error("Selecione uma data"); return; }
    addReminder({
      leadId,
      leadName,
      type,
      note: note.trim() || `Lembrete: ${type} com ${leadName}`,
      dueAt,
      authorName: CONSULTANTS[0],
    });
    toast.success("Lembrete criado!");
    setNote(""); setDueAt(""); setType("call");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/15"><Bell className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="text-sm font-semibold">Novo Lembrete</p>
                    <p className="text-xs text-muted-foreground">{leadName}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Type */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Tipo</p>
                  <div className="flex gap-2 flex-wrap">
                    {(["call", "whatsapp", "email", "meeting", "other"] as Reminder["type"][]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors",
                          type === t ? "bg-primary/15 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t === "call" ? "📞 Ligação" : t === "whatsapp" ? "💬 WhatsApp" : t === "email" ? "📧 E-mail" : t === "meeting" ? "🗓 Reunião" : "📌 Outro"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Observação</p>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex: Confirmar se recebeu a cotação..."
                    className="bg-secondary/50"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Data e hora</p>
                  <div className="flex gap-2 flex-wrap">
                    {QUICK_OPTIONS.map((opt) => (
                      <button
                        key={opt.days}
                        onClick={() => setQuickDate(opt.days)}
                        className="px-2.5 py-1 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end px-5 pb-5">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Criar Lembrete
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
