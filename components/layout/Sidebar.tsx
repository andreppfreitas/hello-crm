"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Kanban,
  PlusCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Bell,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { reminders } = useCRM();
  const { t } = useLanguage();

  const NAV_ITEMS = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/leads", label: t("leads"), icon: Users },
    { href: "/pipeline", label: t("pipeline"), icon: Kanban },
    { href: "/leads/new", label: t("newLead"), icon: PlusCircle },
    { href: "/reminders", label: t("reminders"), icon: Bell, badge: true },
    { href: "/briefing", label: t("briefing"), icon: Sparkles },
    { href: "/reports", label: t("reports"), icon: BarChart3 },
    { href: "/import", label: t("import"), icon: Upload },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];
  const overdueCount = reminders.filter((r) => !r.completed && isOverdue(r.dueAt)).length;
  const pendingCount = reminders.filter((r) => !r.completed).length;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border min-w-0">
        {collapsed ? (
          /* Collapsed: just the gold H icon */
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-sm font-black text-primary-foreground">H</span>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hello-logo.png" alt="Hello Australia" className="h-10 w-auto" />
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href) && href !== "/leads/new";
          const activeNew = href === "/leads/new" && pathname === "/leads/new";
          const isActive = href === "/leads/new" ? activeNew : active;
          return (
            <Link key={href} href={href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <div className="relative flex-shrink-0">
                  <Icon className="w-4 h-4 relative z-10" />
                  {badge && pendingCount > 0 && (
                    <span className={cn(
                      "absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center z-20",
                      overdueCount > 0 ? "bg-red-500 text-white" : "bg-primary text-primary-foreground"
                    )}>
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 }}
                    className="relative z-10 whitespace-nowrap flex-1"
                  >
                    {label}
                  </motion.span>
                )}
                {!collapsed && badge && pendingCount > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full relative z-10",
                    overdueCount > 0 ? "bg-red-500/20 text-red-400" : "bg-primary/15 text-primary"
                  )}>
                    {pendingCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-50"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
