import { useState } from "react";
import { motion } from "framer-motion";

const EMBLEMS = ["default", "crown", "skull", "phoenix", "wolf", "eagle", "dragon", "cyber"];
const COLORS = [
  { id: "blue", label: "Neon Blue", hex: "#3b82f6" },
  { id: "red", label: "Crimson", hex: "#ef4444" },
  { id: "green", label: "Emerald", hex: "#10b981" },
  { id: "purple", label: "Void", hex: "#8b5cf6" },
  { id: "amber", label: "Gold", hex: "#f59e0b" },
  { id: "cyan", label: "Cyan", hex: "#06b6d4" },
];

interface TeamCreateCardProps {
  onCreateTeam: (name: string, emblem: string, color: string, maxPlayers: number) => void;
  loading?: boolean;
}

export default function TeamCreateCard({ onCreateTeam, loading }: TeamCreateCardProps) {
  const [name, setName] = useState("");
  const [emblem, setEmblem] = useState("default");
  const [color, setColor] = useState("blue");
  const [maxPlayers, setMaxPlayers] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    onCreateTeam(name.trim(), emblem, color, maxPlayers);
  };

  const selColor = COLORS.find(c => c.id === color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong cipher-border rounded-lg p-6 max-w-md mx-auto"
      style={{ borderColor: `${selColor?.hex}40` }}
    >
      <div className="flex items-center gap-3 mb-6">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <span className="font-mono text-xs text-zinc-500 tracking-widest">CREATE TEAM // OPERATION GROUP</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Team Name */}
        <div>
          <label className="font-mono text-[10px] text-zinc-600 tracking-widest mb-2 block">TEAM DESIGNATION</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="NIGHT CROWS"
            maxLength={24}
            className="w-full bg-black/40 border border-zinc-700/60 rounded px-4 py-3 font-mono text-sm text-zinc-200 placeholder-zinc-700 focus:border-blue-500/60 focus:outline-none transition-colors"
            style={{ borderColor: name ? `${selColor?.hex}60` : undefined }}
          />
        </div>

        {/* Emblem Selection */}
        <div>
          <label className="font-mono text-[10px] text-zinc-600 tracking-widest mb-2 block">TEAM EMBLEM</label>
          <div className="grid grid-cols-4 gap-2">
            {EMBLEMS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmblem(e)}
                className={`p-3 rounded border text-center text-lg transition-all ${
                  emblem === e
                    ? "bg-blue-500/10 border-blue-500/60"
                    : "bg-black/20 border-zinc-800/60 hover:border-zinc-600/60"
                }`}
                style={emblem === e ? { borderColor: `${selColor?.hex}80` } : undefined}
              >
                {e === "default" && "🔰"}
                {e === "crown" && "👑"}
                {e === "skull" && "💀"}
                {e === "phoenix" && "🔥"}
                {e === "wolf" && "🐺"}
                {e === "eagle" && "🦅"}
                {e === "dragon" && "🐉"}
                {e === "cyber" && "⚡"}
                <div className="font-mono text-[7px] text-zinc-700 mt-1 uppercase">{e}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Team Color */}
        <div>
          <label className="font-mono text-[10px] text-zinc-600 tracking-widest mb-2 block">TEAM COLOR</label>
          <div className="flex gap-3">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                className={`w-10 h-10 rounded-full transition-all ${
                  color === c.id ? "ring-2 ring-offset-2 ring-offset-black scale-110" : "opacity-60 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.hex, boxShadow: color === c.id ? `0 0 0 2px ${c.hex}` : undefined }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Max Players */}
        <div>
          <label className="font-mono text-[10px] text-zinc-600 tracking-widest mb-2 block">MAX OPERATIVES</label>
          <div className="flex gap-3">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxPlayers(n)}
                className={`flex-1 py-3 rounded font-mono text-sm border transition-all ${
                  maxPlayers === n
                    ? "bg-blue-500/10 border-blue-500/60 text-blue-300"
                    : "bg-black/20 border-zinc-800/60 text-zinc-500 hover:border-zinc-600/60"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={name.trim().length < 2 || loading}
          className="w-full py-4 font-mono text-sm tracking-widest hologram-btn-blue rounded-lg disabled:opacity-30"
        >
          {loading ? "INITIALIZING..." : "DEPLOY TEAM"}
        </button>
      </form>
    </motion.div>
  );
}
