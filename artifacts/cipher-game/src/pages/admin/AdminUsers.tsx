import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPage, AdminTable, AdminButton, AdminInput, AdminBadge, adminFetch } from "./AdminLayout";
import { cn } from "@/lib/utils";
import { Search, Shield, Ban, Coins, Eye, X, Users, ChevronLeft, ChevronRight, UserCheck, RotateCcw } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [msg, setMsg] = useState("");

  function loadUsers() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    adminFetch(`/admin/users?${params}`).then(r => r.json()).then(d => {
      if (d.error) setError(d.error);
      else { setUsers(d.users || []); setTotal(d.total); }
    }).catch(() => setError("Failed to load users")).finally(() => setLoading(false));
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

  async function resetXP(id: number) {
    if (!confirm("Reset XP and level for this user?")) return;
    const r = await adminFetch(`/admin/users/${id}/reset-xp`, { method: "POST" });
    const d = await r.json();
    setMsg(d.error || "XP reset");
    loadUsers();
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      super_admin: "danger", admin: "danger", moderator: "warning",
      content_manager: "info", analyst: "info", player: "success",
    };
    return variants[role] || "default";
  };

  const totalPages = Math.ceil(total / 20);

  const headers = ["ID", "Username", "Email", "Role", "Level", "XP", "Coins", "Banned", "Actions"];
  const rows = users.map(u => [
    <span className="font-mono text-xs text-muted-foreground">{u.id}</span>,
    <span className="font-medium text-foreground">{u.username}</span>,
    <span className="text-xs text-muted-foreground">{u.email || "-"}</span>,
    <AdminBadge variant={getRoleBadge(u.role)}>{u.role || "player"}</AdminBadge>,
    <span className="font-mono text-xs">{u.stats?.level || 1}</span>,
    <span className="font-mono text-xs text-muted-foreground">{u.stats?.xp || 0}</span>,
    <span className="font-mono text-xs text-yellow-400">{u.stats?.coins || 0}</span>,
    u.banned ? <span className="text-xs text-red-400 font-semibold">Yes</span> : <span className="text-xs text-green-400">No</span>,
    <div className="flex gap-1">
      <AdminButton onClick={() => setSelected(u)}><Eye className="w-3 h-3 mr-1" /> View</AdminButton>
      <AdminButton onClick={() => changeRole(u.id)}><Shield className="w-3 h-3 mr-1" /> Role</AdminButton>
      {u.banned
        ? <AdminButton variant="ghost" onClick={() => unbanUser(u.id)}><UserCheck className="w-3 h-3 mr-1" /> Unban</AdminButton>
        : <AdminButton variant="danger" onClick={() => banUser(u.id)}><Ban className="w-3 h-3 mr-1" /> Ban</AdminButton>
      }
      <AdminButton onClick={() => resetXP(u.id)}><RotateCcw className="w-3 h-3 mr-1" /> Reset XP</AdminButton>
    </div>,
  ]);

  return (
    <AdminPage title="User Management" description={`${total} registered users`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <AdminInput
            value={search}
            onChange={setSearch}
            placeholder="Search by username or email..."
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>
        {msg && <span className="text-xs text-cyan-400 animate-pulse">{msg}</span>}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> {selected.username} <span className="text-xs text-muted-foreground font-normal">#{selected.id}</span>
                </h3>
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <pre className="text-xs font-mono text-muted-foreground max-h-60 overflow-auto bg-black/30 p-3 rounded-lg border border-zinc-800/40 mb-3">
                {JSON.stringify(selected, null, 2)}
              </pre>
              <div className="flex gap-2">
              <AdminButton onClick={() => giveCoins(selected.id)}><Coins className="w-3 h-3 mr-1" /> Give Coins</AdminButton>
              <AdminButton onClick={() => changeRole(selected.id)}><Shield className="w-3 h-3 mr-1" /> Change Role</AdminButton>
              <AdminButton onClick={() => resetXP(selected.id)}><RotateCcw className="w-3 h-3 mr-1" /> Reset XP</AdminButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
          {error}
          <button onClick={loadUsers} className="ml-3 text-blue-400 hover:text-blue-300">RETRY</button>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-zinc-900/50 border border-zinc-800/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <AdminTable headers={headers} rows={rows} />
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <AdminButton disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-3 h-3 mr-1" /> Prev
          </AdminButton>
          <span>Page {page} of {totalPages}</span>
          <AdminButton disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="w-3 h-3 ml-1" />
          </AdminButton>
        </div>
      )}
    </AdminPage>
  );
}
