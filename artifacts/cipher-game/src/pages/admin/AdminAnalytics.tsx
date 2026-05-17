import { useState, useEffect } from "react";
import { AdminPage, AdminButton, AdminTable, adminFetch } from "./AdminLayout";

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/admin/analytics").then(r => r.json()).then(d => {
      if (!d.error) setData(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminPage title="Analytics"><p style={{ color: "#5a7a8a" }}>Loading...</p></AdminPage>;
  if (!data) return <AdminPage title="Analytics"><p style={{ color: "#ff1744" }}>No data</p></AdminPage>;

  return (
    <AdminPage title="Analytics">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ color: "#00e5ff", fontSize: "0.9rem", marginBottom: "12px" }}>Daily Registrations (30 days)</h3>
          <div style={{ display: "flex", gap: "2px", alignItems: "end", height: "120px" }}>
            {(data.dailyUsers || []).slice(-20).map((d: any, i: number) => (
              <div key={i} style={{
                flex: 1, background: "rgba(0,229,255,0.3)", borderRadius: "2px 2px 0 0",
                height: `${Math.min(100, (Number(d.registrations) || 1) * 10)}px`,
                minWidth: "8px", position: "relative",
              }}>
                <span style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", color: "#5a7a8a" }}>
                  {d.registrations}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ color: "#00e5ff", fontSize: "0.9rem", marginBottom: "12px" }}>Hourly Activity (7 days)</h3>
          <div style={{ display: "flex", gap: "2px", alignItems: "end", height: "120px" }}>
            {(data.hourlyActivity || []).map((h: any, i: number) => (
              <div key={i} style={{
                flex: 1, background: "rgba(0,229,255,0.3)", borderRadius: "2px 2px 0 0",
                height: `${Math.min(100, (Number(h.actions) || 1) / 5)}px`,
                minWidth: "12px", position: "relative",
              }}>
                <span style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", color: "#5a7a8a" }}>
                  {h.hour}h
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ color: "#00e5ff", fontSize: "0.9rem", marginBottom: "12px" }}>Category Success Rate</h3>
          {(data.categoryStats || []).map((c: any, i: number) => {
            const pct = c.total > 0 ? Math.round((Number(c.correct) / Number(c.total)) * 100) : 0;
            return (
              <div key={i} style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#b8d4e3", marginBottom: "4px" }}>
                  <span>{c.category}</span>
                  <span>{pct}% ({c.correct}/{c.total})</span>
                </div>
                <div style={{ background: "#0a1628", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct > 70 ? "#00e566" : pct > 40 ? "#e5a100" : "#ff1744", borderRadius: "3px" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ color: "#00e5ff", fontSize: "0.9rem", marginBottom: "12px" }}>Top Events (7 days)</h3>
          <AdminTable headers={["Event Type", "Count"]}
            rows={(data.eventCounts || []).slice(0, 10).map((e: any) => [e.event_type, e.count])} />
        </div>
      </div>
    </AdminPage>
  );
}
