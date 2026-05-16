import { motion, AnimatePresence } from "framer-motion";

interface HintPanelProps {
  hint: string;
  category: string;
  visible: boolean;
}

export function ArchiveScanPanel({ hint, category, visible }: HintPanelProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="overflow-hidden"
        >
          <div className="glass rounded-lg border border-cyan-700/40 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-[10px] text-cyan-400 tracking-widest">
                ARCHIVE SCAN // INTEL RETRIEVAL
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] text-zinc-600 tracking-widest">
                CATEGORY: {category.toUpperCase()}
              </span>
            </div>
            <p className="font-mono text-xs text-cyan-300/90 leading-relaxed border-l border-cyan-700/40 pl-3">
              {hint}
            </p>
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="h-0.5 bg-cyan-500/30 rounded"
                  style={{ width: `${Math.random() * 20 + 5}px` }}
                  animate={{ opacity: [0.2, 0.8, 0.2] }}
                  transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ThreatPredictionPanelProps {
  predictedCategory: string;
  confidence: string;
  visible: boolean;
}

export function ThreatPredictionPanel({ predictedCategory, confidence, visible }: ThreatPredictionPanelProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="glass rounded-lg border border-amber-700/40 p-3 mb-4"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] text-amber-400 tracking-widest">
              THREAT PREDICTION
            </span>
            <span className="font-mono text-[10px] text-amber-600">{confidence} CONFIDENCE</span>
          </div>
          <p className="font-mono text-xs text-amber-300/80">
            NEXT INTEL LIKELY: <span className="text-amber-400 font-bold">{predictedCategory.toUpperCase()}</span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MemoryRecallPanelProps {
  similarQuestion: string;
  visible: boolean;
}

export function MemoryRecallPanel({ similarQuestion, visible }: MemoryRecallPanelProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="glass rounded-lg border border-purple-700/40 p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="font-mono text-[10px] text-purple-400 tracking-widest">
              MEMORY RECALL // ARCHIVE FRAGMENT
            </span>
          </div>
          <p className="font-mono text-xs text-purple-300/80 leading-relaxed italic border-l border-purple-700/40 pl-3">
            "{similarQuestion}"
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface OverclockWarningProps {
  visible: boolean;
  timerMultiplier: number;
}

export function OverclockWarning({ visible, timerMultiplier }: OverclockWarningProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="glass rounded-lg border border-red-700/60 p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-red-500"
            />
            <span className="font-mono text-[10px] text-red-400 tracking-widest">
              OVERCLOCK // SYSTEM INSTABILITY
            </span>
          </div>
          <p className="font-mono text-xs text-red-300/80">
            TIMER COMPRESSED TO {Math.round(timerMultiplier * 100)}% NORMAL SPEED. XP MULTIPLIER ACTIVE.
          </p>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 h-1 bg-red-500/30 rounded"
                animate={{ opacity: [0.1, 0.8, 0.1] }}
                transition={{ duration: 0.3, delay: i * 0.1, repeat: Infinity }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
