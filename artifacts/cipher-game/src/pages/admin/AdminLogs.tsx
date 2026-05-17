import { useState, useEffect } from "react";
import { AdminPage, AdminTable, AdminButton, adminFetch } from "./AdminLayout";

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/admin/logs?page=${page}&limit=50`).then(r => r.json()).then(d => {
      if (d.logs) { setLogs(d.logs); setTotal(d.total); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  const headers = ["Time", "Admin", "Action", "Target", "Data"];
  const rows = logs.map(l => [
    new Date(l.created_at).toLocaleString(),
    l.admin_name || `#${l.admin_id}`,
    <span style={{ color: l.action.includes("BANNED") ? "#ff1744" : l.action.includes("DELETED") ? "#e5a100" : "#00e5ff" }}>{l.action}</span>,
    l.target_type ? `${l.target_type}:${l.target_id}` : "-",
    l.data ? JSON.stringify(l.data).substring(0, 60) : "-",
  ]);

  const totalPages = Math.ceil(total / 50);

  return (
    <AdminPage title="Audit Logs">
      <p style={{ color: "#5a7a8a", fontSize: "0.8rem", marginBottom: "16px" }}>
        {total} total admin actions recorded
      </p>
      {loading ? <p style={{ color: "#5a7a8a" }}>Loading...</p> : <AdminTable headers={headers} rows={rows} />}
      <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.8rem", color: "#5a7a8a" }}>
        <AdminButton disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</AdminButton>
        <span>Page {page} of {totalPages}</span>
        <AdminButton disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</AdminButton>
      </div>
    </AdminPage>
  );
}
