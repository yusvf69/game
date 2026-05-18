import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPage, AdminTable, AdminButton, adminFetch } from "./AdminLayout";
import { cn } from "@/lib/utils";
import { Film, ArrowLeft, Clock, Users, Gamepad2, Play, CheckCircle, XCircle, Bell, Zap, Flag, SkipForward, Timer } from "lucide-react";

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

const EVENT_ICONS: Record<string, typeof Play> = {
  match_created: Gamepad2, team_configured: Users, match_started: Play,
  buzzer_pressed: Bell, answer_correct: CheckCircle, answer_incorrect: XCircle,
  next_question: SkipForward, match_ended: Flag, question_skipped: Zap,
  timer_expired: Timer,
};

const EVENT_COLORS: Record<string, string> = {
  match_created: "text-blue-400", team_configured: "text-purple-400", match_started: "text-green-400",
  buzzer_pressed: "text-orange-400", answer_correct: "text-green-400", answer_incorrect: "text-red-400",
  next_question: "text-cyan-400", match_ended: "text-yellow-400", question_skipped: "text-zinc-400",
  timer_expired: "text-red-400",
};

export default function AdminReplays() {
  const [replays, setReplays] = useState<ReplaySummary[]>([]);
  const [selected, setSelected] = useState<ReplayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/admin/replays")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setReplays(d.replays || []);
      })
      .catch(() => setError("Failed to load replays"))
      .finally(() => setLoading(false));
  }, []);

  const loadReplay = async (matchId: number) => {
    setSelected(null);
    const res = await adminFetch(`/admin/replays/${matchId}`);
    const data = await res.json();
    setSelected(data);
  };

  return (
    <AdminPage title="Match Replays" description="Browse and review completed match replays">
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
          {error}
        </motion.div>
      )}

      {!selected ? (
        <>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-zinc-900/50 border border-zinc-800/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <AdminTable
              headers={["Match ID", "Room", "Teams", "Questions", "Events", "Date", ""]}
              rows={replays.map(r => [
                <span className="font-mono text-xs text-muted-foreground">{r.matchId}</span>,
                <span className="font-mono text-sm text-foreground">{r.roomCode}</span>,
                <span className="font-mono text-xs">{r.teamCount}</span>,
                <span className="font-mono text-xs">{r.totalQuestions}</span>,
                <span className="font-mono text-xs">{r.phases}</span>,
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>,
                <AdminButton onClick={() => loadReplay(r.matchId)}><Play className="w-3 h-3 mr-1" /> View</AdminButton>,
              ])}
            />
          )}
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AdminButton onClick={() => setSelected(null)} variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
          </AdminButton>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Match</span>
              <p className="text-xl font-bold text-foreground mt-1">#{selected.matchId}</p>
              <p className="text-xs text-muted-foreground mt-1">Room: {selected.roomCode}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phase</span>
              <p className="text-xl font-bold text-foreground mt-1 capitalize">{selected.phase}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(selected.createdAt).toLocaleDateString()}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Teams</span>
              <div className="mt-1 space-y-1">
                {selected.teams.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium" style={{ color: t.color }}>{t.name}</span>
                    <span className="font-mono text-muted-foreground">{t.score}pts ({t.correct}/{t.total})</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" /> Event Log ({selected.log.length} events)
            </h3>
            <div className="max-h-[500px] overflow-y-auto rounded-xl border border-zinc-800/60 bg-zinc-900/30">
              {selected.log.map((evt, i) => {
                const team = evt.teamId ? selected.teams.find((t: any) => t.id === evt.teamId) : null;
                const Icon = EVENT_ICONS[evt.type] || Play;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.01 }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/30 text-xs",
                      i % 2 === 0 ? "bg-zinc-900/20" : "bg-transparent"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", EVENT_COLORS[evt.type] || "text-muted-foreground")} />
                    <span className="text-muted-foreground font-mono shrink-0 w-16">{formatTime(evt.timestamp)}</span>
                    <span className="text-foreground font-semibold capitalize shrink-0 min-w-[100px]">{evt.type.replace(/_/g, " ")}</span>
                    {team && <span className="font-semibold shrink-0" style={{ color: team.color }}>{team.name}</span>}
                    {evt.data && (
                      <span className="text-muted-foreground truncate ml-auto max-w-[200px]">
                        {JSON.stringify(evt.data).slice(0, 80)}
                      </span>
                    )}
                  </motion.div>
                );
              })}
              {selected.log.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">No events recorded</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AdminPage>
  );
}
