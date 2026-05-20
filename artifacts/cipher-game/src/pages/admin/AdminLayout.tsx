import { useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import {
  LayoutDashboard, Play, Users, BookOpen, ShoppingCart, Globe,
  Trophy, Zap, ArrowUp, BarChart3, ClipboardList, Settings, Film, Swords,
  Menu, X, LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/matches", label: "Live Matches", icon: Play },
  { href: "/admin/teams", label: "Teams", icon: Swords },
  { href: "/admin/questions", label: "Questions", icon: BookOpen },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/replays", label: "Replays", icon: Film },
  { href: "/admin/story", label: "Story", icon: ClipboardList },
  { href: "/admin/shop", label: "Shop", icon: ShoppingCart },
  { href: "/admin/events", label: "Events", icon: Globe },
  { href: "/admin/battle-pass", label: "Battle Pass", icon: Trophy },
  { href: "/admin/skills", label: "Skill Tree", icon: Zap },
  { href: "/admin/prestige", label: "Prestige", icon: ArrowUp },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/logs", label: "Audit Logs", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function adminFetch(path: string, options: RequestInit = {}) {
  const BASE = import.meta.env.VITE_API_URL || "";
  const token = getToken();
  return fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

export function AdminPage({ children, title, description }: { children: ReactNode; title: string; description?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-7xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground neon-text-blue">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </motion.div>
  );
}

export function AdminCard({ title, value, subtitle, icon: Icon, color = "primary" }: {
  title: string; value: string | number; subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>; color?: string;
}) {
  const colors: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 border-primary/30",
    purple: "from-secondary/20 to-secondary/5 border-secondary/30",
    green: "from-green-500/20 to-green-500/5 border-green-500/30",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
    red: "from-red-500/20 to-red-500/5 border-red-500/30",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
  };
  const iconColors: Record<string, string> = {
    primary: "text-primary", purple: "text-secondary", green: "text-green-400",
    orange: "text-orange-400", red: "text-red-400", cyan: "text-cyan-400",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "rounded-xl border bg-gradient-to-br p-5 flex flex-col gap-2",
        colors[color] || colors.primary
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        {Icon && <Icon className={cn("w-5 h-5", iconColors[color] || iconColors.primary)} />}
      </div>
      <span className="text-3xl font-bold text-foreground">{value}</span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </motion.div>
  );
}

export function AdminTable({ headers, rows }: { headers: string[]; rows: (ReactNode)[][] }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-sidebar border-b border-border">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {rows.map((row, ri) => (
                <motion.tr
                  key={ri}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: ri * 0.03 }}
                  className={cn(
                    "border-b border-border/50 transition-colors hover:bg-sidebar/50",
                    ri % 2 === 0 ? "bg-card/30" : "bg-transparent"
                  )}
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-sm text-foreground/80">{cell}</td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
            {rows.length === 0 && (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-muted-foreground">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminBadge({ variant = "default", children }: { variant?: "default" | "success" | "warning" | "danger" | "info"; children: ReactNode }) {
  const variants: Record<string, string> = {
    default: "bg-muted text-muted-foreground border-border",
    success: "bg-green-500/10 text-green-400 border-green-500/30",
    warning: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    danger: "bg-red-500/10 text-red-400 border-red-500/30",
    info: "bg-primary/10 text-primary border-primary/30",
  };
  return <Badge className={cn("font-mono text-xs", variants[variant])}>{children}</Badge>;
}

// Legacy helpers for pages not yet migrated
export function AdminButton({ children, onClick, variant = "primary", disabled, loading, style }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "danger" | "ghost"; disabled?: boolean; loading?: boolean; style?: any;
}) {
  const shadcnVariant = variant === "danger" ? "destructive" : variant === "ghost" ? "ghost" : "default";
  return <Button variant={shadcnVariant as any} size="sm" onClick={onClick} disabled={disabled || loading} style={style}>{children}</Button>;
}

export function AdminInput({ value, onChange, placeholder, type = "text", style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: any;
}) {
  return <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full" style={style} />;
}

export function AdminSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { label: string; value: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function AdminLayout() {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!getToken()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Unauthorized</h1>
          <p className="text-muted-foreground">Please log in to access admin panel</p>
          <Button className="mt-4" onClick={() => window.location.href = "/"}>Go to Login</Button>
        </motion.div>
      </div>
    );
  }

  const pages: Record<string, { component: ReactNode; title: string }> = {
    "/admin": { component: <AdminDashboard />, title: "Dashboard" },
    "/admin/matches": { component: <AdminMatches />, title: "Live Match Center" },
    "/admin/teams": { component: <AdminTeams />, title: "Team Management" },
    "/admin/questions": { component: <AdminQuestions />, title: "Question Management" },
    "/admin/users": { component: <AdminUsers />, title: "User Management" },
    "/admin/replays": { component: <AdminReplays />, title: "Match Replays" },
    "/admin/story": { component: <AdminStory />, title: "Story Management" },
    "/admin/shop": { component: <AdminShop />, title: "Shop Management" },
    "/admin/events": { component: <AdminEvents />, title: "World Events" },
    "/admin/battle-pass": { component: <AdminBattlePass />, title: "Battle Pass" },
    "/admin/skills": { component: <AdminSkills />, title: "Skill Tree" },
    "/admin/prestige": { component: <AdminPrestige />, title: "Prestige" },
    "/admin/analytics": { component: <AdminAnalytics />, title: "Analytics" },
    "/admin/logs": { component: <AdminLogs />, title: "Audit Logs" },
    "/admin/settings": { component: <AdminSettings />, title: "Settings" },
  };

  const current = pages[location];
  if (!current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Page Not Found</h1>
          <p className="text-muted-foreground mt-2">Admin page not found: {location}</p>
          <Button className="mt-4" onClick={() => setLocation("/admin")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Toaster position="top-right" />
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-56"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </Button>
          {!collapsed && <span className="text-sm font-bold text-primary tracking-wider">ADMIN</span>}
        </div>
        <ScrollArea className="flex-1 px-2 py-2">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(item.href)}
                  className={cn(
                    "w-full justify-start gap-3 px-3 py-2 h-auto text-sm font-normal",
                    active ? "bg-sidebar-primary/10 text-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => window.location.href = "/"}>
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Back to Site</span>}
          </Button>
        </div>
      </aside>
      <main className={cn("flex-1 overflow-auto transition-all duration-300", collapsed ? "ml-16" : "ml-56 lg:ml-0")}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {current.component}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

import AdminDashboard from "./AdminDashboard";
import AdminMatches from "./AdminMatches";
import AdminQuestions from "./AdminQuestions";
import AdminUsers from "./AdminUsers";
import AdminReplays from "./AdminReplays";
import AdminTeams from "./AdminTeams";
import AdminStory from "./AdminStory";
import AdminShop from "./AdminShop";
import AdminEvents from "./AdminEvents";
import AdminBattlePass from "./AdminBattlePass";
import AdminSkills from "./AdminSkills";
import AdminPrestige from "./AdminPrestige";
import AdminAnalytics from "./AdminAnalytics";
import AdminLogs from "./AdminLogs";
import AdminSettings from "./AdminSettings";
