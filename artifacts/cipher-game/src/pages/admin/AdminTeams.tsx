import { useState, useEffect } from "react";
import { AdminPage, AdminTable, AdminButton, AdminInput, adminFetch } from "./AdminLayout";

interface Team {
  id: number;
  name: string;
  description: string;
  user_id: number;
  username: string;
  member_count: number;
  match_count: number;
  created_at: string;
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [renameValue, setRenameValue] = useState("");
  const [transferId, setTransferId] = useState("");

  const loadTeams = () => {
    setLoading(true);
    adminFetch("/admin/teams")
      .then(r => r.json())
      .then(d => { setTeams(d.teams || []); setLoading(false); })
      .catch(() => setLoading(false));
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

  if (loading) return <AdminPage title="Team Management"><p>Loading...</p></AdminPage>;

  if (selectedTeam) {
    return (
      <AdminPage title={`Team: ${selectedTeam.team?.name || "#" + selectedTeam.team?.id}`}>
        <AdminButton onClick={() => setSelectedTeam(null)} variant="ghost">← Back to list</AdminButton>

        <div style={{ display: "flex", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
          <div style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "8px", padding: "16px", flex: 1 }}>
            <h3 style={{ color: "#00e5ff", marginBottom: "12px" }}>Rename</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <AdminInput value={renameValue} onChange={setRenameValue} placeholder="New name" />
              <AdminButton onClick={renameTeam}>Save</AdminButton>
            </div>
          </div>

          <div style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "8px", padding: "16px", flex: 1 }}>
            <h3 style={{ color: "#00e5ff", marginBottom: "12px" }}>Transfer Ownership</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <AdminInput value={transferId} onChange={setTransferId} placeholder="New leader user ID" type="number" />
              <AdminButton onClick={transferTeam}>Transfer</AdminButton>
            </div>
          </div>
        </div>

        <h3 style={{ color: "#00e5ff", marginTop: "20px", marginBottom: "8px" }}>Members</h3>
        <AdminTable
          headers={["User ID", "Username", "Role"]}
          rows={(selectedTeam.members || []).map((m: any) => [m.user_id, m.username, m.role])}
        />

        <h3 style={{ color: "#00e5ff", marginTop: "20px", marginBottom: "8px" }}>Recent Matches</h3>
        <AdminTable
          headers={["Match ID", "Score", "Date"]}
          rows={(selectedTeam.matches || []).map((m: any) => [
            m.match_id, m.score || "-", new Date(m.created_at).toLocaleDateString(),
          ])}
        />

        <div style={{ marginTop: "20px" }}>
          <AdminButton onClick={() => deleteTeam(selectedTeam.team.id)} variant="danger">Delete Team</AdminButton>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Team Management">
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
        <AdminButton onClick={loadTeams} variant="ghost">Refresh</AdminButton>
      </div>
      <AdminTable
        headers={["ID", "Name", "Leader", "Members", "Matches", "Created", ""]}
        rows={teams.map(t => [
          t.id,
          t.name,
          t.username || "—",
          t.member_count,
          t.match_count,
          new Date(t.created_at).toLocaleDateString(),
          <div style={{ display: "flex", gap: "4px" }}>
            <AdminButton onClick={() => viewTeam(t.id)}>View</AdminButton>
            <AdminButton onClick={() => deleteTeam(t.id)} variant="danger">Delete</AdminButton>
          </div>,
        ])}
      />
    </AdminPage>
  );
}
