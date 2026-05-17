import { useState, useEffect } from "react";
import { AdminPage, AdminCard, adminFetch } from "./AdminLayout";

interface DashboardStats {
  stats: {
    totalUsers: number; onlineNow: number; totalMatches: number;
    xpToday: number; activeMatches: number; questionsCount: number;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/admin/dashboard").then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); return; }
      setData(d);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminPage title="Dashboard"><p style={{ color: "#5a7a8a" }}>Loading...</p></AdminPage>;
  if (error) return <AdminPage title="Dashboard"><p style={{ color: "#ff1744" }}>{error}</p></AdminPage>;
  if (!data) return null;

  return (
    <AdminPage title="Control Center">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <AdminCard title="Total Users" value={data.stats.totalUsers} />
        <AdminCard title="Online Now" value={data.stats.onlineNow} subtitle="Active sessions" />
        <AdminCard title="Active Matches" value={data.stats.activeMatches} />
        <AdminCard title="Total Matches" value={data.stats.totalMatches} />
        <AdminCard title="Questions" value={data.stats.questionsCount} />
        <AdminCard title="XP Today" value={data.stats.xpToday.toLocaleString()} />
      </div>

      <div style={{
        background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "24px",
      }}>
        <h2 style={{ fontSize: "1rem", color: "#00e5ff", marginBottom: "16px" }}>Quick Actions</h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <QuickAction href="/admin/matches" label="Monitor Live Matches" />
          <QuickAction href="/admin/questions" label="Manage Questions" />
          <QuickAction href="/admin/users" label="Manage Users" />
          <QuickAction href="/admin/analytics" label="View Analytics" />
        </div>
      </div>
    </AdminPage>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} onClick={e => { e.preventDefault(); window.location.href = href; }} style={{
      padding: "12px 20px", borderRadius: "8px", border: "1px solid rgba(0,229,255,0.2)",
      background: "rgba(0,229,255,0.05)", color: "#b8d4e3", cursor: "pointer", fontSize: "0.85rem",
      transition: "all 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,229,255,0.12)"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.4)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,229,255,0.05)"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"; }}
    >{label} →</a>
  );
}
