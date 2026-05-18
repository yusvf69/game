import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPage, AdminTable, AdminButton, AdminInput, adminFetch } from "./AdminLayout";
import { cn } from "@/lib/utils";
import { ClipboardList, Search, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";

const ACTION_TYPES = [
  "BANNED", "UNBANNED", "ROLE_CHANGED", "COINS_GIVEN",
  "TEAM_RENAMED", "TEAM_TRANSFERRED", "TEAM_DELETED",
  "MATCH_ENDED", "MATCH_PAUSED", "QUESTION_CREATED",
  "QUESTION_DELETED", "SETTINGS_UPDATED",
];

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (actionFilter) params.set("action", actionFilter);
    if (searchQuery) params.set("search", searchQuery);
    adminFetch(`/admin/logs?${params}`).then(r => r.json()).then(d => {
      if (d.error) setError(d.error);
      else { setLogs(d.logs || []); setTotal(d.total); }
    }).catch(() => setError("Failed to load logs")).finally(() => setLoading(false));
  }, [page, actionFilter, searchQuery]);

  const getActionColor = (action: string) => {
    if (action.includes("BANNED") || action.includes("DELETED")) return "text-red-400";
    if (action.includes("ENDED") || action.includes("PAUSED")) return "text-orange-400";
    if (action.includes("CREATED") || action.includes("GIVEN")) return "text-green-400";
    return "text-cyan-400";
  };

  const totalPages = Math.ceil(total / 50);

  const headers = ["Time", "Admin", "Action", "Target", "Data"];
  const rows = logs.map(l => [
    <span className="text-xs text-muted-foreground font-mono">{new Date(l.created_at).toLocaleString()}</span>,
    <span className="text-xs text-foreground">{l.admin_name || `#${l.admin_id}`}</span>,
    <span className={cn("text-xs font-semibold", getActionColor(l.action))}>{l.action}</span>,
    <span className="text-xs text-muted-foreground">{l.target_type ? `${l.target_type}:${l.target_id}` : "-"}</span>,
    <span className="text-xs text-muted-foreground font-mono">{l.data ? JSON.stringify(l.data).substring(0, 60) : "-"}</span>,
  ]);

  return (
    <AdminPage title="Audit Logs" description={`${total} total admin actions recorded`}>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <AdminInput
            value={searchQuery}
            onChange={v => { setSearchQuery(v); setPage(1); }}
            placeholder="Search logs..."
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="h-9 pl-8 pr-8 rounded-lg border border-zinc-800 bg-zinc-950 text-xs font-mono text-muted-foreground focus:outline-none focus:border-zinc-600 appearance-none cursor-pointer"
          >
            <option value="">All actions</option>
            {ACTION_TYPES.map(a => (
              <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
            ))}
          </select>
          {actionFilter && (
            <button onClick={() => setActionFilter("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
          {error}
          <button onClick={() => window.location.reload()} className="ml-3 text-blue-400 hover:text-blue-300">RETRY</button>
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
