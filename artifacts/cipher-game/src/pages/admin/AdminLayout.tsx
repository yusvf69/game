import { useState, ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { getToken } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "⊞", section: "general" },
  { href: "/admin/matches", label: "Live Matches", icon: "▶", section: "game" },
  { href: "/admin/questions", label: "Questions", icon: "?" },
  { href: "/admin/users", label: "Users", icon: "👤" },
  { href: "/admin/replays", label: "Replays", icon: "🎬" },
  { href: "/admin/story", label: "Story", icon: "📖" },
  { href: "/admin/shop", label: "Shop", icon: "🛒" },
  { href: "/admin/events", label: "Events", icon: "🌍" },
  { href: "/admin/battle-pass", label: "Battle Pass", icon: "🎖" },
  { href: "/admin/skills", label: "Skill Tree", icon: "⚡" },
  { href: "/admin/prestige", label: "Prestige", icon: "⬆" },
  { href: "/admin/analytics", label: "Analytics", icon: "📊" },
  { href: "/admin/logs", label: "Audit Logs", icon: "📝" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
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

export function AdminPage({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "24px", color: "#00e5ff" }}>{title}</h1>
      {children}
    </div>
  );
}

export function AdminTable({ headers, rows }: { headers: string[]; rows: (string | number | ReactNode)[][] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #1a3a4a", borderRadius: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "#0a1628", borderBottom: "1px solid #1a3a4a" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 16px", textAlign: "left", color: "#00e5ff", fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid #0f1e2e", background: ri % 2 === 0 ? "#0d1a2a" : "#0a1628" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "8px 16px", color: "#b8d4e3" }}>{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} style={{ padding: "24px", textAlign: "center", color: "#5a7a8a" }}>No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AdminCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0d1a2a, #0a1628)", border: "1px solid #1a3a4a",
      borderRadius: "12px", padding: "20px", minWidth: "180px",
    }}>
      <div style={{ fontSize: "0.75rem", color: "#5a7a8a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "2rem", fontWeight: 700, color: "#00e5ff" }}>{value}</div>
      {subtitle && <div style={{ fontSize: "0.75rem", color: "#5a7a8a", marginTop: "4px" }}>{subtitle}</div>}
    </div>
  );
}

export function AdminStat({ title, value, color = "#00e5ff" }: { title: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "8px", padding: "16px", minWidth: "120px",
    }}>
      <div style={{ fontSize: "0.7rem", color: "#5a7a8a", textTransform: "uppercase", marginBottom: "4px" }}>{title}</div>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export function AdminButton({ children, onClick, variant = "primary", disabled, style }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "danger" | "ghost"; disabled?: boolean; style?: any;
}) {
  const colors: Record<string, string> = {
    primary: "#00e5ff", danger: "#ff1744", ghost: "transparent",
  };
  const bg: Record<string, string> = {
    primary: "rgba(0,229,255,0.1)", danger: "rgba(255,23,68,0.1)", ghost: "transparent",
  };
  const border: Record<string, string> = {
    primary: "1px solid rgba(0,229,255,0.3)", danger: "1px solid rgba(255,23,68,0.3)", ghost: "1px solid transparent",
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "6px 14px", borderRadius: "6px", border: variant !== "ghost" ? border[variant] : "none",
      background: bg[variant], color: colors[variant], cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "0.8rem", fontWeight: 600, opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}

export function AdminInput({ value, onChange, placeholder, type = "text", style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: any;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
      padding: "8px 12px", borderRadius: "6px", border: "1px solid #1a3a4a", background: "#0a1628",
      color: "#b8d4e3", fontSize: "0.875rem", outline: "none", width: "100%", ...style,
    }} />
  );
}

export function AdminSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { label: string; value: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      padding: "8px 12px", borderRadius: "6px", border: "1px solid #1a3a4a", background: "#0a1628",
      color: "#b8d4e3", fontSize: "0.875rem", outline: "none",
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function AdminLayout() {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const pages: Record<string, { component: ReactNode; title: string }> = {
    "/admin": { component: <AdminDashboard />, title: "Dashboard" },
    "/admin/matches": { component: <AdminMatches />, title: "Live Match Center" },
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
    return <div style={{ padding: "48px", textAlign: "center", color: "#ff1744" }}>Admin page not found: {location}</div>;
  }

  if (!getToken()) {
    return <div style={{ padding: "48px", textAlign: "center", color: "#ff1744" }}>Please log in to access admin panel</div>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#060d18", color: "#b8d4e3", fontFamily: "'Inter', sans-serif" }}>
      <nav style={{
        width: collapsed ? "56px" : "220px", transition: "width 0.2s", background: "#080f1e",
        borderRight: "1px solid #1a3a4a", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #1a3a4a", display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", color: "#00e5ff", cursor: "pointer", fontSize: "1.2rem" }}>
            {collapsed ? "☰" : "✕"}
          </button>
          {!collapsed && <span style={{ fontWeight: 700, color: "#00e5ff", fontSize: "0.9rem" }}>ADMIN</span>}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {NAV_ITEMS.map(item => {
            const active = location === item.href;
            return (
              <a key={item.href} href={item.href} onClick={e => { e.preventDefault(); setLocation(item.href); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "6px",
                  textDecoration: "none", color: active ? "#00e5ff" : "#5a7a8a", marginBottom: "2px",
                  background: active ? "rgba(0,229,255,0.08)" : "transparent", fontSize: "0.8rem",
                  fontWeight: active ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden",
                }}>
                <span>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </a>
            );
          })}
        </div>
        <div style={{ padding: "12px", borderTop: "1px solid #1a3a4a" }}>
          <a href="/" onClick={e => { e.preventDefault(); setLocation("/"); }}
            style={{ color: "#5a7a8a", textDecoration: "none", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
            ← {!collapsed && "Back to Site"}
          </a>
        </div>
      </nav>
      <main style={{ flex: 1, overflow: "auto" }}>
        {current.component}
      </main>
    </div>
  );
}

// ─── Page Components ─────────────────────────────────────────────────

import AdminDashboard from "./AdminDashboard";
import AdminMatches from "./AdminMatches";
import AdminQuestions from "./AdminQuestions";
import AdminUsers from "./AdminUsers";
import AdminStory from "./AdminStory";
import AdminShop from "./AdminShop";
import AdminEvents from "./AdminEvents";
import AdminBattlePass from "./AdminBattlePass";
import AdminSkills from "./AdminSkills";
import AdminPrestige from "./AdminPrestige";
import AdminAnalytics from "./AdminAnalytics";
import AdminLogs from "./AdminLogs";
import AdminSettings from "./AdminSettings";
import AdminReplays from "./AdminReplays";
