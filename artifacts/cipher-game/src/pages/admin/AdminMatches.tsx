import { useState, useEffect } from "react";
import { AdminPage, AdminTable, AdminButton, adminFetch } from "./AdminLayout";

export default function AdminMatches() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [actionMsg, setActionMsg] = useState("");

  function loadMatches() {
    setLoading(true);
    adminFetch("/admin/matches").then(r => r.json()).then(d => {
      if (d.matches) setMatches(d.matches);
    }).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { loadMatches(); const i = setInterval(loadMatches, 5000); return () => clearInterval(i); }, []);

  async function doAction(action: string, body = {}) {
    if (!selected) return;
    const r = await adminFetch(`/admin/matches/${selected.match_id}/${action}`, {
      method: "POST", body: JSON.stringify(body),
    });
    const d = await r.json();
    setActionMsg(d.error || `${action} successful`);
    loadMatches();
  }

  const headers = ["Room", "Host", "Status", "Phase", "Teams", "Created", "Actions"];
  const rows = matches.map(m => {
    const s = m.state || {};
    return [
      m.room_code, m.host_id, s.phase || "?", s.phase,
      (s.teams || []).map((t: any) => t.name || `Team ${t.id}`).join(", "),
      new Date(m.created_at).toLocaleDateString(),
      <AdminButton key="view" onClick={() => setSelected(m)}>View</AdminButton>,
    ];
  });

  return (
    <AdminPage title="Live Match Center">
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
        <AdminButton onClick={loadMatches}>↻ Refresh</AdminButton>
        {actionMsg && <span style={{ color: "#00e5ff", fontSize: "0.8rem" }}>{actionMsg}</span>}
      </div>

      {selected && (
        <div style={{
          background: "#0d1a2a", border: "1px solid #00e5ff", borderRadius: "12px", padding: "20px", marginBottom: "20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ color: "#00e5ff", margin: 0 }}>Match #{selected.match_id} — Room: {selected.room_code}</h3>
            <AdminButton variant="danger" onClick={() => setSelected(null)}>Close</AdminButton>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <AdminButton onClick={() => doAction("pause")}>⏸ Pause</AdminButton>
            <AdminButton onClick={() => doAction("resume")}>▶ Resume</AdminButton>
            <AdminButton variant="danger" onClick={() => doAction("end")}>⏹ End Match</AdminButton>
            <AdminButton onClick={() => doAction("force-next")}>⏭ Force Next</AdminButton>
          </div>
          <pre style={{ color: "#b8d4e3", fontSize: "0.75rem", maxHeight: "300px", overflow: "auto", background: "#0a1628", padding: "12px", borderRadius: "8px" }}>
            {JSON.stringify(selected, null, 2)}
          </pre>
        </div>
      )}

      {loading && matches.length === 0 ? (
        <p style={{ color: "#5a7a8a" }}>Loading...</p>
      ) : (
        <AdminTable headers={headers} rows={rows} />
      )}
    </AdminPage>
  );
}
