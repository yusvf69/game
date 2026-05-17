import { useState, useEffect } from "react";
import { AdminPage, adminFetch } from "./AdminLayout";

export default function AdminPrestige() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/admin/prestige").then(r => r.json()).then(d => {
      if (d.prestigeUsers) setUsers(d.prestigeUsers);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AdminPage title="Prestige">
      {loading ? <p style={{ color: "#5a7a8a" }}>Loading...</p> : (
        <div style={{ display: "grid", gap: "8px" }}>
          {users.map((u, i) => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px",
              background: i === 0 ? "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05))" : "#0d1a2a",
              border: i === 0 ? "1px solid rgba(255,215,0,0.3)" : "1px solid #1a3a4a",
              borderRadius: "8px",
            }}>
              <span style={{ color: i === 0 ? "#ffd700" : "#5a7a8a", fontWeight: 700, width: "24px" }}>#{i + 1}</span>
              <span style={{ flex: 1, color: "#b8d4e3" }}>{u.username}</span>
              <span style={{ color: "#00e5ff" }}>Prestige {u.prestige_level}</span>
              <span style={{ color: "#5a7a8a", fontSize: "0.8rem" }}>Lv.{u.level} ({u.xp} XP)</span>
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
