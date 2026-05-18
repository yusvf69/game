import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPage, AdminTable, AdminBadge, adminFetch } from "./AdminLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw, Pause, Play, SkipForward, XCircle, Trophy, Swords, ArrowLeft, Gamepad2, UserMinus } from "lucide-react";

export default function AdminMatches() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [scoreTeamId, setScoreTeamId] = useState("");
  const [scoreValue, setScoreValue] = useState("");
  const [kickTeamId, setKickTeamId] = useState("");

  function loadMatches() {
    setLoading(true);
    setError(null);
    adminFetch("/admin/matches").then(r => r.json()).then(d => {
      if (d.error) setError(d.error);
      else setMatches(d.matches || []);
    }).catch(() => setError("Failed to load matches")).finally(() => setLoading(false));
  }

  useEffect(() => { loadMatches(); const i = setInterval(loadMatches, 5000); return () => clearInterval(i); }, []);

  async function doAction(action: string, body = {}) {
    if (!selected) return;
    const r = await adminFetch(`/admin/matches/${selected.match_id}/${action}`, {
      method: "POST", body: JSON.stringify(body),
    });
    const d = await r.json();
    if (d.error) toast.error(d.error);
    else toast.success(`${action} successful`);
    loadMatches();
  }

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      lobby: "default", question: "info", buzzed: "warning",
      answered: "success", rebuzz: "warning", ended: "default", paused: "danger",
    };
    return colors[phase] || "default";
  };

  if (selected) {
    const state = selected.state || {};
    return (
      <AdminPage title={`Match ${selected.room_code}`} description={`ID: ${selected.match_id}`}>
        <Button variant="outline" size="sm" onClick={() => setSelected(null)} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to list
        </Button>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-zinc-800/60 bg-zinc-900/50">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
              <div className="mt-1"><AdminBadge variant={getPhaseColor(state.phase)}>{state.phase || "unknown"}</AdminBadge></div>
            </CardContent>
          </Card>
          <Card className="border-zinc-800/60 bg-zinc-900/50">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Teams</span>
              <p className="text-lg font-bold text-foreground">{state.teams?.filter((t: any) => t.name).length || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800/60 bg-zinc-900/50">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Question</span>
              <p className="text-lg font-bold text-foreground">{(state.currentQuestionIndex || 0) + 1}/{state.totalQuestions || "?"}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800/60 bg-zinc-900/50">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Buzzed</span>
              <p className="text-lg font-bold text-foreground">{state.buzzerTeamId ? `Team ${state.buzzerTeamId}` : "None"}</p>
            </CardContent>
          </Card>
        </div>

        {state.teams?.filter((t: any) => t.name).map((team: any) => (
          <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 mb-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30"
          >
            <div className="flex items-center gap-3">
              <Swords className="w-5 h-5" style={{ color: team.color }} />
              <div>
                <span className="font-semibold text-foreground">{team.name}</span>
                <span className="text-xs text-muted-foreground ml-2">Score: {team.score}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-zinc-800/50 px-2 py-1 rounded">{team.correct}/{team.total} correct</span>
              {state.phase !== "ended" && (
                <Button size="sm" variant="destructive" className="h-7 text-[10px] px-2"
                  onClick={() => { doAction("kick-team", { teamId: team.id }); }}>
                  <UserMinus className="w-3 h-3" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}

        <div className="flex flex-wrap gap-2 mt-6 p-4 rounded-lg border border-zinc-800/60 bg-zinc-900/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full mb-2">Controls</span>
          {state.phase !== "paused" ? (
            <Button size="sm" variant="outline" onClick={() => doAction("pause")}><Pause className="w-4 h-4 mr-1" /> Pause</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => doAction("resume")}><Play className="w-4 h-4 mr-1" /> Resume</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => doAction("force-next")}><SkipForward className="w-4 h-4 mr-1" /> Force Next</Button>
          <Button size="sm" variant="destructive" onClick={() => doAction("end")}><XCircle className="w-4 h-4 mr-1" /> End Match</Button>
          <div className="flex items-center gap-2">
            <Input placeholder="Team ID" value={kickTeamId} onChange={e => setKickTeamId(e.target.value)} className="w-20 h-8 text-xs" />
            <Button size="sm" variant="destructive" onClick={() => { doAction("kick-team", { teamId: parseInt(kickTeamId) }); setKickTeamId(""); }}>
              <UserMinus className="w-4 h-4 mr-1" /> Kick Team
            </Button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Input placeholder="Team ID" value={scoreTeamId} onChange={e => setScoreTeamId(e.target.value)} className="w-20 h-8 text-xs" />
            <Input placeholder="Score" value={scoreValue} onChange={e => setScoreValue(e.target.value)} className="w-20 h-8 text-xs" />
            <Button size="sm" variant="outline" onClick={() => { doAction("score", { teamId: parseInt(scoreTeamId), score: parseInt(scoreValue) }); setScoreTeamId(""); setScoreValue(""); }}>
              <Trophy className="w-4 h-4 mr-1" /> Set Score
            </Button>
          </div>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Live Match Center" description="Real-time monitoring and control of all stage matches">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={loadMatches} className="gap-2">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
        </Button>
        <span className="text-xs text-muted-foreground">{matches.length} matches</span>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
          {error}
          <button onClick={loadMatches} className="ml-3 text-blue-400 hover:text-blue-300">RETRY</button>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl bg-zinc-800/50" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-16 text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Gamepad2 className="w-8 h-8 text-muted-foreground/30" />
          No active matches right now.
        </motion.div>
      ) : (
        <AdminTable
          headers={["Room", "Host", "Status", "Phase", "Teams", "Created", ""]}
          rows={matches.map(m => {
            const state = m.state || {};
            return [
              <span className="font-mono text-sm text-foreground">{m.room_code || "—"}</span>,
              <span className="text-xs text-muted-foreground">{m.host_id ? `#${m.host_id}` : "—"}</span>,
              <AdminBadge variant={getPhaseColor(state.phase)}>{state.phase || "unknown"}</AdminBadge>,
              <span className="text-xs text-muted-foreground capitalize">{state.phase || "—"}</span>,
              <span className="font-mono text-xs">{state.teams?.filter((t: any) => t.name).length || 0}</span>,
              <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>,
              <Button size="sm" variant="outline" onClick={() => setSelected(m)}>Manage</Button>,
            ];
          })}
        />
      )}
    </AdminPage>
  );
}
