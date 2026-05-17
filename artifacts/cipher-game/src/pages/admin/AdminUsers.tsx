import { useState, useEffect } from "react";
import { AdminPage, AdminTable, AdminButton, AdminInput, adminFetch } from "./AdminLayout";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [msg, setMsg] = useState("");

  function loadUsers() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    adminFetch(`/admin/users?${params}`).then(r => r.json()).then(d => {
      if (d.users) { setUsers(d.users); setTotal(d.total); }
    }).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, [page, search]);

  async function banUser(id: number) {
    const reason = prompt("Ban reason:");
    if (!reason) return;
    const hours = prompt("Duration in hours (leave empty for permanent):");
    const r = await adminFetch(`/admin/users/${id}/ban`, {
      method: "POST", body: JSON.stringify({ reason, expiresInHours: hours ? parseInt(hours) : undefined }),
    });
    const d = await r.json();
    setMsg(d.error || "User banned");
    loadUsers();
  }

  async function unbanUser(id: number) {
    const r = await adminFetch(`/admin/users/${id}/unban`, { method: "POST" });
    const d = await r.json();
    setMsg(d.error || "User unbanned");
    loadUsers();
  }

  async function changeRole(id: number) {
    const role = prompt("New role (player/moderator/content_manager/analyst/admin/super_admin):");
    if (!role) return;
    const r = await adminFetch(`/admin/users/${id}/role`, {
      method: "POST", body: JSON.stringify({ role }),
    });
    const d = await r.json();
    setMsg(d.error || "Role changed");
    loadUsers();
  }

  async function giveCoins(id: number) {
    const amount = prompt("Coin amount:");
    if (!amount) return;
    const r = await adminFetch(`/admin/users/${id}/give-coins`, {
      method: "POST", body: JSON.stringify({ amount: parseInt(amount) }),
    });
    const d = await r.json();
    setMsg(d.error || "Coins given");
    loadUsers();
  }

  const headers = ["ID", "Username", "Email", "Role", "Level", "XP", "Coins", "Banned", "Actions"];
  const rows = users.map(u => [
    u.id, u.username, u.email || "-", u.role || "player",
    u.stats?.level || 1, u.stats?.xp || 0, u.stats?.coins || 0,
    u.banned ? <span style={{ color: "#ff1744" }}>Yes</span> : <span style={{ color: "#00e566" }}>No</span>,
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      <AdminButton onClick={() => setSelected(u)}>View</AdminButton>
      <AdminButton onClick={() => changeRole(u.id)}>Role</AdminButton>
      {u.banned
        ? <AdminButton variant="ghost" onClick={() => unbanUser(u.id)}>Unban</AdminButton>
        : <AdminButton variant="danger" onClick={() => banUser(u.id)}>Ban</AdminButton>
      }
    </div>,
  ]);

  return (
    <AdminPage title="User Management">
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" }}>
        <AdminInput value={search} onChange={setSearch} placeholder="Search by username or email..." style={{ maxWidth: "300px" }} />
        {msg && <span style={{ color: "#00e5ff", fontSize: "0.8rem" }}>{msg}</span>}
      </div>

      {selected && (
        <div style={{
          background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "20px", marginBottom: "20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ color: "#00e5ff", margin: 0 }}>{selected.username} (#{selected.id})</h3>
            <AdminButton variant="danger" onClick={() => setSelected(null)}>Close</AdminButton>
          </div>
          <pre style={{ color: "#b8d4e3", fontSize: "0.75rem", maxHeight: "400px", overflow: "auto", background: "#0a1628", padding: "12px", borderRadius: "8px" }}>
            {JSON.stringify(selected, null, 2)}
          </pre>
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <AdminButton onClick={() => giveCoins(selected.id)}>Give Coins</AdminButton>
            <AdminButton variant="danger" onClick={() => changeRole(selected.id)}>Change Role</AdminButton>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: "#5a7a8a" }}>Loading...</p> : <AdminTable headers={headers} rows={rows} />}

      <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.8rem", color: "#5a7a8a" }}>
        <AdminButton disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</AdminButton>
        <span>Page {page} of {Math.ceil(total / 20)} ({total} total)</span>
        <AdminButton disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next →</AdminButton>
      </div>
    </AdminPage>
  );
}
