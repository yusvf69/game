import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const DOMAIN_META: Record<string, { icon: string; title: string; subtitle: string }> = {
  cyber_systems: { icon: "⚡", title: "CYBER SYSTEMS", subtitle: "NETWORK PENETRATION DIVISION" },
  cognitive_analysis: { icon: "🧠", title: "COGNITIVE ANALYSIS", subtitle: "LOGIC & REASONING DIVISION" },
  historical_archives: { icon: "📜", title: "HISTORICAL ARCHIVES", subtitle: "STRATEGIC RETROSPECTIVE DIVISION" },
  threat_intelligence: { icon: "🛡️", title: "THREAT INTELLIGENCE", subtitle: "SECURITY ASSESSMENT DIVISION" },
  scientific_division: { icon: "🔬", title: "SCIENTIFIC DIVISION", subtitle: "TECHNICAL ANALYSIS DIVISION" },
  behavioral_analysis: { icon: "🎭", title: "BEHAVIORAL ANALYSIS", subtitle: "PSYCHOLOGICAL PROFILING DIVISION" },
  global_mapping: { icon: "🌍", title: "GLOBAL MAPPING", subtitle: "GEOSPATIAL INTELLIGENCE DIVISION" },
  cipher_division: { icon: "🔐", title: "CIPHER DIVISION", subtitle: "CRYPTOGRAPHIC ANALYSIS DIVISION" },
};

interface Props {
  domain: string;
  teamColor: string;
  onComplete: () => void;
}

const COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6", red: "#ef4444", green: "#10b981",
  purple: "#8b5cf6", amber: "#f59e0b", cyan: "#06b6d4",
  pink: "#ec4899", orange: "#f97316",
};

export default function LocalCategoryIntro({ domain, teamColor, onComplete }: Props) {
  const [count, setCount] = useState(3);
  const meta = DOMAIN_META[domain] || { icon: "📡", title: domain.toUpperCase(), subtitle: "INTELLIGENCE DIVISION" };
  const colorHex = COLOR_HEX[teamColor] || "#3b82f6";

  useEffect(() => {
    if (count <= 0) { onComplete(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)`,
      }} />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="text-center relative z-10"
      >
        {/* Glitch line */}
        <motion.div
          animate={{ x: [0, -3, 2, -1, 0], opacity: [1, 0.3, 1, 0.5, 1] }}
          transition={{ duration: 0.3, repeat: count > 0 ? 0 : Infinity }}
          className="text-7xl mb-6"
          style={{ color: colorHex }}
        >
          {meta.icon}
        </motion.div>

        <motion.h1
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-mono text-5xl font-black tracking-[0.15em] mb-3"
          style={{ color: colorHex, textShadow: `0 0 30px ${colorHex}66` }}
        >
          {meta.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-mono text-sm tracking-[0.3em] mb-10"
          style={{ color: `${colorHex}99` }}
        >
          {meta.subtitle}
        </motion.p>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-4">
          {count > 0 && (
            <motion.div
              key={count}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="font-mono text-8xl font-black"
              style={{ color: colorHex, textShadow: `0 0 60px ${colorHex}88` }}
            >
              {count}
            </motion.div>
          )}
          {count === 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="font-mono text-3xl font-black tracking-widest"
              style={{ color: "#22c55e", textShadow: "0 0 40px #22c55e88" }}
            >
              BEGIN
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Bottom scan line */}
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 0.8, ease: "linear" }}
        className="absolute bottom-1/3 left-0 w-full h-px"
        style={{ backgroundColor: colorHex, boxShadow: `0 0 10px ${colorHex}` }}
      />
    </motion.div>
  );
}
