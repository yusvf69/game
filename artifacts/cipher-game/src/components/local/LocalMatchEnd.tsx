import { motion } from "framer-motion";
import { useLocalMatchStore } from "@/stores/localMatchStore";

const COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6", red: "#ef4444", green: "#10b981",
  purple: "#8b5cf6", amber: "#f59e0b", cyan: "#06b6d4",
  pink: "#ec4899", orange: "#f97316",
};

const EMBLEM_ICONS: Record<string, string> = {
  default: "🔰", crown: "👑", skull: "💀", phoenix: "🔥",
  wolf: "🐺", eagle: "🦅", dragon: "🐉", cyber: "⚡",
  raven: "🐦‍⬛", ghost: "👻", cipher: "🔐", strike: "⚔️",
};

export default function LocalMatchEnd() {
  const { teams, scores, reset } = useLocalMatchStore();

  const sorted = [...teams]
    .map((t) => ({ ...t, ...scores[t.id] }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const winner = sorted[0];
  const winnerHex = COLOR_HEX[winner?.color || "blue"] || "#3b82f6";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: `${winnerHex}08` }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-lg w-full"
      >
        {/* Winner celebration */}
        <motion.div
          animate={{
            textShadow: [
              `0 0 20px ${winnerHex}44`,
              `0 0 60px ${winnerHex}88`,
              `0 0 20px ${winnerHex}44`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl mb-4"
        >
          🏆
        </motion.div>

        <motion.h1
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-mono text-5xl font-black mb-2"
          style={{ color: winnerHex, textShadow: `0 0 30px ${winnerHex}66` }}
        >
          MISSION COMPLETE
        </motion.h1>

        <p className="font-mono text-xs text-zinc-600 tracking-[0.3em] mb-8">OPERATION TERMINATED</p>

        {/* Winner card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-8 border-2 mb-8"
          style={{ borderColor: `${winnerHex}60` }}
        >
          <div className="text-5xl mb-3">{EMBLEM_ICONS[winner?.emblem || "default"] || "🔰"}</div>
          <div className="font-mono text-3xl font-black mb-1" style={{ color: winnerHex }}>
            {winner?.name || "—"}
          </div>
          <div className="font-mono text-lg text-zinc-400 mb-1">
            {winner?.score || 0} POINTS
          </div>
          <div className="font-mono text-xs text-zinc-600">
            {winner?.correct || 0}/{winner?.total || 0} CORRECT
            {winner?.streak ? ` • ${winner.streak}x PEAK STREAK` : ""}
          </div>
        </motion.div>

        {/* Full ranking */}
        <div className="space-y-3 mb-8">
          {sorted.map((entry, i) => {
            const hex = COLOR_HEX[entry.color] || "#3b82f6";
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-4 glass rounded-lg p-4 border border-zinc-800/40"
              >
                <span className="font-mono text-lg w-8 text-center">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <span className="text-2xl">{EMBLEM_ICONS[entry.emblem] || "🔰"}</span>
                <div className="flex-1 text-left">
                  <span className="font-mono text-sm font-bold" style={{ color: hex }}>
                    {entry.name}
                  </span>
                  <span className="font-mono text-xs text-zinc-600 ml-3">
                    {entry.correct || 0}/{entry.total || 0}
                  </span>
                </div>
                <span className="font-mono text-lg font-black tabular-nums" style={{ color: hex }}>
                  {entry.score || 0}
                </span>
              </motion.div>
            );
          })}
        </div>

        <button onClick={reset}
          className="w-full py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg">
          NEW OPERATION
        </button>
      </motion.div>
    </div>
  );
}
