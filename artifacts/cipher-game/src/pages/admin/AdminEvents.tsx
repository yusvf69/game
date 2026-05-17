import { useState, useEffect } from "react";
import { AdminPage, AdminTable, AdminButton, adminFetch } from "./AdminLayout";

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/admin/events").then(r => r.json()).then(d => {
      if (d.events) setEvents(d.events);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AdminPage title="World Events">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {loading ? <p style={{ color: "#5a7a8a" }}>Loading...</p> : events.map(e => (
          <div key={e.id} style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "0.75rem", color: e.status === "active" ? "#00e566" : "#e5a100", marginBottom: "4px" }}>
              {e.status}
            </div>
            <h3 style={{ color: "#00e5ff", fontSize: "1rem", margin: "0 0 8px" }}>{e.title}</h3>
            <p style={{ fontSize: "0.8rem", color: "#5a7a8a", margin: "0" }}>{e.description}</p>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}
