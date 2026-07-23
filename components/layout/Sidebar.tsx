"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Kanban,
  PlusCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Sparkles,
  Upload,
  X,
  UserCog,
  Activity,
  TrendingUp,
  MessageSquareText,
} from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { reminders } = useCRM();
  const { t } = useLanguage();
  const { user } = useAuth();

  const NAV_ITEMS = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/leads", label: t("leads"), icon: Users },
    { href: "/pipeline", label: t("pipeline"), icon: Kanban },
    { href: "/leads/new", label: t("newLead"), icon: PlusCircle },
    { href: "/templates", label: "Templates", icon: MessageSquareText },
    { href: "/reminders", label: t("reminders"), icon: Bell, badge: true },
    { href: "/briefing", label: t("briefing"), icon: Sparkles },
    { href: "/reports", label: t("reports"), icon: BarChart3 },
    { href: "/funil", label: "Funil", icon: TrendingUp },
    { href: "/import", label: t("import"), icon: Upload },
    ...(user?.role === "admin" ? [
      { href: "/users", label: "Equipe", icon: UserCog },
      { href: "/activity", label: "Atividades", icon: Activity },
    ] : []),
    { href: "/settings", label: t("settings"), icon: Settings },
  ];
  const overdueCount = reminders.filter((r) => !r.completed && isOverdue(r.dueAt)).length;
  const pendingCount = reminders.filter((r) => !r.completed).length;

  const navContent = (isCollapsed: boolean) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border min-w-0">
        {isCollapsed ? (
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-sm font-black text-primary-foreground">H</span>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hello-logo.png" alt="Hello Australia" className="h-20 w-auto max-w-[180px]" />
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
            <Link key={href} href={href} onClick={onMobileClose}>
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
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 }}
                    className="relative z-10 whitespace-nowrap flex-1"
                  >
                    {label}
                  </motion.span>
                )}
                {!isCollapsed && badge && pendingCount > 0 && (
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
    </>
  );

  return (
    <>
      {/* ── MOBILE: overlay drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={onMobileClose}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed left-0 top-0 bottom-0 w-64 flex flex-col bg-sidebar border-r border-sidebar-border z-50 lg:hidden"
            >
              {/* Close button */}
              <button
                onClick={onMobileClose}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>
              {navContent(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── DESKTOP: static sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative hidden lg:flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden flex-shrink-0"
      >
        {navContent(collapsed)}

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-50"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>
    </>
  );
}
