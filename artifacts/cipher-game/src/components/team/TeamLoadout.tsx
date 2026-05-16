import { motion } from "framer-motion";

const MODULE_OPTIONS = [
  { id: "signal_trace", icon: "📡", name: "Signal Trace", desc: "Eliminates 2 wrong answers", energy: 1 },
  { id: "time_dilation", icon: "⏳", name: "Time Dilation", desc: "+10 seconds to timer", energy: 2 },
  { id: "archive_scan", icon: "📖", name: "Archive Scan", desc: "Reveals contextual hint", energy: 1 },
  { id: "ghost_protocol", icon: "👻", name: "Ghost Protocol", desc: "Protects streak once", energy: 3 },
  { id: "neural_boost", icon: "🧬", name: "Neural Boost", desc: "+25% XP this question", energy: 2 },
  { id: "threat_prediction", icon: "🎯", name: "Threat Prediction", desc: "Predicts next category", energy: 1 },
  { id: "memory_recall", icon: "💾", name: "Memory Recall", desc: "Shows similar past question", energy: 2 },
  { id: "overclock", icon: "⚠️", name: "Overclock", desc: "Compresses timer, triples XP", energy: 5 },
  { id: "jam_signal", icon: "📵", name: "Jam Signal", desc: "Slows opponent by 1s", energy: 3 },
  { id: "false_ping", icon: "🎭", name: "False Ping", desc: "Glitches opponent UI briefly", energy: 2 },
  { id: "data_shield", icon: "🛡️", name: "Data Shield", desc: "Protects streak/combo", energy: 3 },
];

const RARITY_ORDER: Record<string, string> = {
  signal_trace: "border-zinc-700/60",
  archive_scan: "border-zinc-700/60",
  threat_prediction: "border-green-700/60",
  time_dilation: "border-zinc-700/60",
  neural_boost: "border-green-700/60",
  memory_recall: "border-blue-700/60",
  ghost_protocol: "border-blue-700/60",
  overclock: "border-purple-700/60",
  jam_signal: "border-purple-700/60",
  false_ping: "border-blue-700/60",
  data_shield: "border-blue-700/60",
};

interface TeamLoadoutProps {
  selected: string[];
  onToggle: (moduleId: string) => void;
  onConfirm: () => void;
  readOnly?: boolean;
}

export default function TeamLoadout({ selected, onToggle, onConfirm, readOnly }: TeamLoadoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong cipher-border rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono text-xs text-zinc-500 tracking-widest">TACTICAL LOADOUT</span>
        </div>
        <span className="font-mono text-[10px] text-amber-400/80">
          {selected.length}/3 SELECTED
        </span>
      </div>

      {!readOnly && (
        <p className="font-mono text-[10px] text-zinc-700 mb-4">
          Select up to 3 tactical modules for your operation.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-5">
        {MODULE_OPTIONS.map((mod) => {
          const isSelected = selected.includes(mod.id);
          const isMaxed = selected.length >= 3 && !isSelected;

          let cls = "rounded border p-3 transition-all duration-200 ";
          cls += RARITY_ORDER[mod.id] || "border-zinc-700/60";

          if (isSelected) {
            cls += " bg-blue-500/10 border-blue-500/60";
          } else if (readOnly) {
            cls += " opacity-40";
          } else if (isMaxed) {
            cls += " opacity-30 cursor-not-allowed";
          } else {
            cls += " hover:bg-zinc-800/30 hover:border-zinc-500/60 cursor-pointer";
          }

          return (
            <button
              key={mod.id}
              onClick={() => !readOnly && !isMaxed && onToggle(mod.id)}
              disabled={readOnly || isMaxed}
              className={cls}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{mod.icon}</span>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-mono text-[10px] text-zinc-300 truncate">{mod.name}</div>
                  <div className="font-mono text-[8px] text-zinc-600 truncate">{mod.desc}</div>
                </div>
                {isSelected && <span className="text-blue-400 text-xs">✓</span>}
              </div>
              <div className="font-mono text-[8px] text-zinc-700 mt-1">{mod.energy} EN</div>
            </button>
          );
        })}
      </div>

      {!readOnly && (
        <button
          onClick={onConfirm}
          disabled={selected.length === 0}
          className="w-full py-3 font-mono text-xs tracking-widest hologram-btn rounded-lg disabled:opacity-30"
        >
          {selected.length === 0 ? "SELECT MODULES" : `CONFIRM LOADOUT (${selected.length}/3)`}
        </button>
      )}
    </motion.div>
  );
}

export { MODULE_OPTIONS };
