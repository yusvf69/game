import { useState, useEffect } from "react";
import { AdminPage, AdminTable, AdminButton, adminFetch } from "./AdminLayout";

interface ReplaySummary {
  matchId: number;
  roomCode: string;
  teamCount: number;
  totalQuestions: number;
  phases: number;
  createdAt: string;
}

interface ReplayDetail {
  matchId: number;
  roomCode: string;
  teams: any[];
  questions: any[];
  log: { type: string; teamId: number | null; data: any; timestamp: number }[];
  phase: string;
  createdAt: string;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AdminReplays() {
  const [replays, setReplays] = useState<ReplaySummary[]>([]);
  const [selected, setSelected] = useState<ReplayDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/admin/replays")
      .then(r => r.json())
      .then(d => { setReplays(d.replays || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadReplay = async (matchId: number) => {
    setSelected(null);
    const res = await adminFetch(`/admin/replays/${matchId}`);
    const data = await res.json();
    setSelected(data);
  };

  if (loading) return <AdminPage title="Match Replays"><p>Loading...</p></AdminPage>;

  return (
    <AdminPage title="Match Replays">
      {!selected ? (
        <>
          <AdminTable
            headers={["Match ID", "Room", "Teams", "Questions", "Events", "Date", ""]}
            rows={replays.map(r => [
              r.matchId,
              r.roomCode,
              r.teamCount,
              r.totalQuestions,
              r.phases,
              new Date(r.createdAt).toLocaleDateString(),
              <AdminButton onClick={() => loadReplay(r.matchId)}>View</AdminButton>,
            ])}
          />
        </>
      ) : (
        <div>
          <AdminButton onClick={() => setSelected(null)} variant="ghost">← Back to list</AdminButton>
          <div style={{ marginTop: "16px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "8px", padding: "16px", flex: 1, minWidth: "200px" }}>
              <div style={{ color: "#5a7a8a", fontSize: "0.75rem", textTransform: "uppercase" }}>Match</div>
              <div style={{ color: "#00e5ff", fontSize: "1.2rem", fontWeight: 700 }}>#{selected.matchId}</div>
              <div style={{ fontSize: "0.85rem", color: "#b8d4e3", marginTop: "4px" }}>Room: {selected.roomCode}</div>
            </div>
            <div style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "8px", padding: "16px", flex: 1, minWidth: "200px" }}>
              <div style={{ color: "#5a7a8a", fontSize: "0.75rem", textTransform: "uppercase" }}>Teams</div>
              <div style={{ color: "#22c55e", fontSize: "1.2rem", fontWeight: 700 }}>{selected.teams.length}</div>
              {selected.teams.map((t: any) => (
                <div key={t.id} style={{ fontSize: "0.85rem", color: "#b8d4e3", marginTop: "2px" }}>
                  {t.name}: {t.score}pts ({t.correct}/{t.total})
                </div>
              ))}
            </div>
          </div>

          <h3 style={{ color: "#00e5ff", marginTop: "24px", marginBottom: "12px" }}>Event Log ({selected.log.length} events)</h3>
          <div style={{ maxHeight: "500px", overflowY: "auto", border: "1px solid #1a3a4a", borderRadius: "8px" }}>
            {selected.log.map((evt, i) => {
              const team = evt.teamId ? selected.teams.find((t: any) => t.id === evt.teamId) : null;
              const iconMap: Record<string, string> = {
                match_created: "🎮", team_configured: "⚙", match_started: "🚀",
                buzzer_pressed: "🔔", answer_correct: "✅", answer_incorrect: "❌",
                next_question: "➡", match_ended: "🏁", question_skipped: "⏭",
                timer_expired: "⏰",
              };
              return (
                <div key={i} style={{
                  padding: "8px 16px", borderBottom: "1px solid #0f1e2e",
                  background: i % 2 === 0 ? "#0d1a2a" : "#0a1628",
                  display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <span style={{ fontSize: "1.2rem" }}>{iconMap[evt.type] || "•"}</span>
                  <span style={{ color: "#5a7a8a", fontSize: "0.75rem", minWidth: "70px" }}>{formatTime(evt.timestamp)}</span>
                  <span style={{ color: "#00e5ff", fontSize: "0.8rem", fontWeight: 600, minWidth: "120px" }}>{evt.type.replace(/_/g, " ")}</span>
                  {team && <span style={{ color: team.color, fontSize: "0.8rem", fontWeight: 600 }}>{team.name}</span>}
                  {evt.data && (
                    <span style={{ color: "#5a7a8a", fontSize: "0.75rem", marginLeft: "auto" }}>
                      {JSON.stringify(evt.data).slice(0, 80)}
                    </span>
                  )}
                </div>
              );
            })}
            {selected.log.length === 0 && (
              <div style={{ padding: "24px", textAlign: "center", color: "#5a7a8a" }}>No events recorded</div>
            )}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
