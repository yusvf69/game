import { motion, AnimatePresence } from "framer-motion";

interface ScoreEntry {
  teamId: number;
  teamName: string;
  color: string;
  emblem: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  currentStreak: number;
}

interface TeamScoreboardProps {
  scores: ScoreEntry[];
  highlightTeamId?: number;
  maxDisplay?: number;
}

const EMBLEM_MAP: Record<string, string> = {
  default: "🔰", crown: "👑", skull: "💀", phoenix: "🔥",
  wolf: "🐺", eagle: "🦅", dragon: "🐉", cyber: "⚡",
};

const COLOR_MAP: Record<string, string> = {
  blue: "#3b82f6", red: "#ef4444", green: "#10b981",
  purple: "#8b5cf6", amber: "#f59e0b", cyan: "#06b6d4",
};

function getRankIcon(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function TeamScoreboard({ scores, highlightTeamId, maxDisplay = 10 }: TeamScoreboardProps) {
  const sorted = [...scores].sort((a, b) => b.score - a.score).slice(0, maxDisplay);

  return (
    <div className="glass-strong cipher-border rounded-lg p-5">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono text-xs text-zinc-500 tracking-widest">SCOREBOARD</span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {sorted.map((entry, i) => {
            const colorHex = COLOR_MAP[entry.color] || "#3b82f6";
            const isHighlighted = highlightTeamId && entry.teamId === highlightTeamId;
            const prevScore = i > 0 ? sorted[i - 1].score : entry.score;

            return (
              <motion.div
                key={entry.teamId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isHighlighted
                    ? "bg-blue-500/10 border-blue-500/40"
                    : "bg-black/20 border-zinc-800/40 hover:border-zinc-700/40"
                }`}
                style={isHighlighted ? { borderColor: `${colorHex}60` } : undefined}
              >
                {/* Rank */}
                <div className="w-8 text-center font-mono text-xs text-zinc-500">
                  {getRankIcon(i + 1)}
                </div>

                {/* Emblem */}
                <div className="text-xl w-8 text-center">{EMBLEM_MAP[entry.emblem] || "🔰"}</div>

                {/* Team Name */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-bold truncate" style={{ color: colorHex }}>
                    {entry.teamName}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-600">
                    {entry.correctAnswers}/{entry.totalAnswers} correct
                    {entry.currentStreak > 0 && ` • ${entry.currentStreak}x streak`}
                  </div>
                </div>

                {/* Score */}
                <motion.div
                  key={entry.score}
                  initial={{ scale: 1.3, color: "#22c55e" }}
                  animate={{ scale: 1, color: colorHex }}
                  className="font-mono text-lg font-black tabular-nums"
                  style={{ color: colorHex }}
                >
                  {entry.score}
                </motion.div>

                {/* Score change bar */}
                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: colorHex }}
                    initial={{ width: 0 }}
                    animate={{ width: `${prevScore > 0 ? (entry.score / sorted[0].score) * 100 : 0}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {scores.length === 0 && (
        <div className="text-center py-8">
          <p className="font-mono text-xs text-zinc-700">No scores yet</p>
        </div>
      )}
    </div>
  );
}

export { EMBLEM_MAP, COLOR_MAP };
