import { motion } from "framer-motion";
import { useLocalMatchStore } from "@/stores/localMatchStore";

const EMBLEM_ICONS: Record<string, string> = {
  default: "🔰", crown: "👑", skull: "💀", phoenix: "🔥",
  wolf: "🐺", eagle: "🦅", dragon: "🐉", cyber: "⚡",
  raven: "🐦‍⬛", ghost: "👻", cipher: "🔐", strike: "⚔️",
};

const COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6", red: "#ef4444", green: "#10b981",
  purple: "#8b5cf6", amber: "#f59e0b", cyan: "#06b6d4",
  pink: "#ec4899", orange: "#f97316",
};

function getRankIcon(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function LocalMatchScoreboard() {
  const { teams, scores, currentTeamIndex } = useLocalMatchStore();

  const sorted = [...teams]
    .map((t) => ({ ...t, score: scores[t.id]?.score || 0 }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="glass rounded-lg p-3 border border-zinc-800/40">
      <div className="font-mono text-[10px] text-zinc-600 tracking-widest mb-2">SCOREBOARD</div>
      <div className="space-y-1.5">
        {sorted.map((team, i) => {
          const isActive = teams[currentTeamIndex]?.id === team.id;
          const hex = COLOR_HEX[team.color] || "#3b82f6";
          const s = scores[team.id];

          return (
            <motion.div
              key={team.id}
              animate={isActive ? { opacity: 1 } : { opacity: 0.7 }}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                isActive ? "bg-zinc-800/40 border-l-2" : ""
              }`}
              style={isActive ? { borderLeftColor: hex } : {}}
            >
              <span className="font-mono text-xs w-5 text-zinc-600">{getRankIcon(i + 1)}</span>
              <span className="text-sm">{EMBLEM_ICONS[team.emblem] || "🔰"}</span>
              <span className="font-mono text-xs font-bold flex-1 truncate" style={{ color: hex }}>
                {team.name}
              </span>
              <span className="font-mono text-sm font-black tabular-nums" style={{ color: hex }}>
                {s?.score || 0}
              </span>
              <span className="font-mono text-[10px] text-zinc-700 w-12 text-right">
                {s?.correct || 0}/{s?.total || 0}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
