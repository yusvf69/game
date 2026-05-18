import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPage, AdminTable, AdminButton, AdminInput, adminFetch } from "./AdminLayout";
import { cn } from "@/lib/utils";
import { Swords, RefreshCw, ArrowLeft, Users, Trophy, Trash2, Edit3, UserPlus } from "lucide-react";

interface Team {
  id: number;
  name: string;
  emblem: string;
  color: string;
  captain_id: number;
  username: string;
  member_count: number;
  match_count: number;
  max_players: number;
  created_at: string;
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [renameValue, setRenameValue] = useState("");
  const [transferId, setTransferId] = useState("");

  const loadTeams = () => {
    setLoading(true);
    setError(null);
    adminFetch("/admin/teams")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setTeams(d.teams || []);
      })
      .catch(() => setError("Failed to load teams"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTeams(); }, []);

  const viewTeam = async (id: number) => {
    const res = await adminFetch(`/admin/teams/${id}`);
    const data = await res.json();
    setSelectedTeam(data);
    setRenameValue(data.team?.name || "");
  };

  const renameTeam = async () => {
    if (!selectedTeam || !renameValue) return;
    await adminFetch(`/admin/teams/${selectedTeam.team.id}/rename`, {
      method: "POST", body: JSON.stringify({ name: renameValue }),
    });
    viewTeam(selectedTeam.team.id);
    loadTeams();
  };

  const transferTeam = async () => {
    if (!selectedTeam || !transferId) return;
    await adminFetch(`/admin/teams/${selectedTeam.team.id}/transfer`, {
      method: "POST", body: JSON.stringify({ newLeaderUserId: parseInt(transferId) }),
    });
    viewTeam(selectedTeam.team.id);
    loadTeams();
  };

  const deleteTeam = async (id: number) => {
    if (!confirm("Delete this team?")) return;
    await adminFetch(`/admin/teams/${id}`, { method: "DELETE" });
    setSelectedTeam(null);
    loadTeams();
  };

  if (selectedTeam) {
    const team = selectedTeam.team || {};
    return (
      <AdminPage title={`Team: ${team.name || "#" + team.id}`}>
        <AdminButton onClick={() => setSelectedTeam(null)} variant="ghost">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
        </AdminButton>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Edit3 className="w-4 h-4 text-primary" /> Rename
            </h3>
            <div className="flex gap-2">
              <AdminInput value={renameValue} onChange={setRenameValue} placeholder="New name" />
              <AdminButton onClick={renameTeam}>Save</AdminButton>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-primary" /> Transfer Ownership
            </h3>
            <div className="flex gap-2">
              <AdminInput value={transferId} onChange={setTransferId} placeholder="New leader user ID" type="number" />
              <AdminButton onClick={transferTeam}>Transfer</AdminButton>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" /> Members
          </h3>
          <AdminTable
            headers={["User ID", "Username", "Role"]}
            rows={(selectedTeam.members || []).map((m: any) => [
              <span className="font-mono text-xs text-muted-foreground">{m.user_id}</span>,
              <span className="text-foreground">{m.username}</span>,
              <span className="text-xs text-muted-foreground capitalize">{m.role}</span>,
            ])}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-primary" /> Recent Matches
          </h3>
          <AdminTable
            headers={["Match ID", "Score", "Date"]}
            rows={(selectedTeam.matches || []).map((m: any) => [
              <span className="font-mono text-xs text-muted-foreground">{m.match_id}</span>,
              <span className="font-mono text-xs">{m.score || "-"}</span>,
              <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>,
            ])}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6">
          <AdminButton onClick={() => deleteTeam(team.id)} variant="danger">
            <Trash2 className="w-4 h-4 mr-1" /> Delete Team
          </AdminButton>
        </motion.div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Team Management" description={`${teams.length} teams registered`}>
      <div className="flex items-center gap-2 mb-4">
        <AdminButton onClick={loadTeams} variant="ghost">
          <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} /> Refresh
        </AdminButton>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
          {error}
          <button onClick={loadTeams} className="ml-3 text-blue-400 hover:text-blue-300">RETRY</button>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-zinc-900/50 border border-zinc-800/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <AdminTable
          headers={["ID", "Name", "Leader", "Members", "Matches", "Created", ""]}
          rows={teams.map(t => [
            <span className="font-mono text-xs text-muted-foreground">{t.id}</span>,
            <span className="flex items-center gap-2">
              {t.emblem && <span className="text-lg">{t.emblem}</span>}
              <span className="font-medium text-foreground" style={t.color ? { color: t.color } : undefined}>{t.name}</span>
            </span>,
            <span className="text-xs text-muted-foreground">{t.username || "—"}</span>,
            <span className="font-mono text-xs">{t.member_count}/{t.max_players}</span>,
            <span className="font-mono text-xs">{t.match_count}</span>,
            <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>,
            <div className="flex gap-1">
              <AdminButton onClick={() => viewTeam(t.id)}>View</AdminButton>
              <AdminButton variant="danger" onClick={() => deleteTeam(t.id)}><Trash2 className="w-3 h-3" /></AdminButton>
            </div>,
          ])}
        />
      )}
    </AdminPage>
  );
}
