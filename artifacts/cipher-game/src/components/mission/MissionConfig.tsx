import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/auth";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const DOMAIN_ICONS: Record<string, string> = {
  cyber_systems: "⚡",
  cognitive_analysis: "🧠",
  historical_archives: "📜",
  threat_intelligence: "🛡️",
  scientific_division: "🔬",
  behavioral_analysis: "🎭",
  global_mapping: "🌍",
  quantitative_operations: "📊",
  ethical_protocols: "⚖️",
  linguistic_decoding: "🔤",
  orbital_intelligence: "🛰️",
  geopolitical_affairs: "🏛️",
  cultural_archives: "🎨",
  ancient_records: "🏺",
  cipher_division: "🔐",
};

interface Domain {
  id: string;
  name: string;
  description: string;
  categories: string[];
}

interface MissionConfigProps {
  onStartMission: (data: any) => void;
  onBack?: () => void;
}

const DIFFICULTIES = [
  { id: "recruit", label: "RECRUIT", sub: "TRAINING PROTOCOL", color: "text-green-400", border: "border-green-500/40", meter: "w-1/4" },
  { id: "agent", label: "AGENT", sub: "STANDARD OPERATION", color: "text-blue-400", border: "border-blue-500/40", meter: "w-2/4" },
  { id: "elite", label: "ELITE", sub: "HIGH RISK MISSION", color: "text-orange-400", border: "border-orange-500/40", meter: "w-3/4" },
  { id: "omega", label: "OMEGA", sub: "CRITICAL THREAT", color: "text-red-400", border: "border-red-500/40", meter: "w-full" },
];

const MODIFIERS = [
  { id: "timed", label: "TIMED PRESSURE", desc: "Reduced time per question", bonus: "+30 XP" },
  { id: "adaptive", label: "ADAPTIVE AI", desc: "AI adjusts difficulty live", bonus: "+20 XP" },
  { id: "bonus_xp", label: "BONUS XP RISK", desc: "Higher stakes, higher rewards", bonus: "×1.3 XP" },
];

export default function MissionConfig({ onStartMission, onBack }: MissionConfigProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [mastery, setMastery] = useState<Record<string, number>>({});
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("agent");
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${BASE_URL}/api/mission/domains`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then((data) => {
      setDomains(data.domains || []);
      setMastery(data.mastery || {});
    }).catch(() => setError("Failed to load domains")).finally(() => setLoading(false));
  }, []);

  const toggleDomain = useCallback((id: string) => {
    setSelectedDomains((prev) => {
      if (prev.includes(id)) return prev.filter((d) => d !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  }, []);

  const toggleModifier = useCallback((id: string) => {
    setModifiers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }, []);

  const threatLevel = (() => {
    let score = selectedDomains.length * 5;
    const diffCfg = DIFFICULTIES.find((d) => d.id === difficulty)!;
    const diffIdx = DIFFICULTIES.indexOf(diffCfg);
    score += diffIdx * 20;
    if (modifiers.includes("timed")) score += 15;
    if (modifiers.includes("adaptive")) score += 10;
    if (modifiers.includes("bonus_xp")) score += 10;
    if (score >= 80) return { label: "CRITICAL", color: "text-purple-400", bar: "w-full bg-purple-500" };
    if (score >= 60) return { label: "SEVERE", color: "text-red-400", bar: "w-5/6 bg-red-500" };
    if (score >= 40) return { label: "HIGH", color: "text-orange-400", bar: "w-3/4 bg-orange-500" };
    if (score >= 20) return { label: "MODERATE", color: "text-yellow-400", bar: "w-1/2 bg-yellow-500" };
    return { label: "LOW", color: "text-green-400", bar: "w-1/4 bg-green-500" };
  })();

  const estimatedXp = (() => {
    const diffCfg = DIFFICULTIES.find((d) => d.id === difficulty)!;
    const diffIdx = DIFFICULTIES.indexOf(diffCfg);
    let base = selectedDomains.length * 40;
    const xpMults = [0.5, 1.0, 1.8, 3.0];
    base = Math.round(base * xpMults[diffIdx]);
    if (modifiers.includes("bonus_xp")) base = Math.round(base * 1.3);
    if (modifiers.includes("timed")) base += 30;
    if (modifiers.includes("adaptive")) base += 20;
    return base;
  })();

  async function handleStart() {
    if (selectedDomains.length === 0) { setError("Select at least one domain"); return; }
    setStarting(true);
    setError("");
    const token = getToken();
    try {
      const res = await fetch(`${BASE_URL}/api/mission/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ domains: selectedDomains, difficulty, modifiers, questionCount: 10 }),
      });
      const data = await res.json();
      if (!res.ok) { throw new Error(data.error || "Failed to start mission"); }
      onStartMission(data);
    } catch (e: any) {
      setError(e.message || "Mission start failed");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="font-mono text-xs text-blue-400 tracking-widest">
          LOADING MISSION CONFIGURATOR...
        </motion.p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto px-4 py-12">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <p className="font-mono text-[10px] text-zinc-600 tracking-[0.4em] mb-2">ARCHIVE OPERATIONS</p>
        <h1 className="font-mono text-4xl font-black text-zinc-100 tracking-wider">
          MISSION <span className="text-blue-400 neon-text-blue">CONFIGURATION</span>
        </h1>
        <div className="flex items-center gap-3 justify-center mt-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-blue-500/40" />
          <span className="font-mono text-xs text-zinc-600 tracking-widest">SELECT INTELLIGENCE DOMAINS</span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-blue-500/40" />
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="max-w-md mx-auto mb-6 text-center font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-4 py-2">
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Domain selection */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-xs text-zinc-500 tracking-widest">INTELLIGENCE DOMAINS</p>
            <p className="font-mono text-[10px] text-zinc-700">{selectedDomains.length}/6 SELECTED</p>
          </div>

          {/* Selected count bar */}
          <div className="h-1 bg-zinc-800 rounded-full mb-6 overflow-hidden">
            <motion.div className="h-full bg-blue-500" animate={{ width: `${(selectedDomains.length / 6) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {domains.map((domain) => {
              const selected = selectedDomains.includes(domain.id);
              const atMax = selectedDomains.length >= 6 && !selected;
              const pct = mastery[domain.id];
              const hasMastery = pct !== undefined && pct >= 0;
              return (
                <motion.button
                  key={domain.id}
                  layout
                  onClick={() => !atMax && toggleDomain(domain.id)}
                  className={`relative text-left p-4 rounded-lg border transition-all duration-200 font-mono ${
                    selected
                      ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                      : atMax
                        ? "bg-zinc-900/50 border-zinc-800/30 opacity-40 cursor-not-allowed"
                        : "glass border-zinc-700/40 hover:border-zinc-500/50 hover:bg-zinc-800/30 cursor-pointer"
                  }`}
                  whileHover={!atMax ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!atMax ? { scale: 0.98 } : {}}
                >
                  {selected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-black text-[10px] font-bold">✓</span>
                    </motion.div>
                  )}
                  <div className="text-xl mb-2">{DOMAIN_ICONS[domain.id] || "◉"}</div>
                  <p className={`text-xs font-bold tracking-wider mb-1 ${selected ? "text-blue-300" : "text-zinc-200"}`}>
                    {domain.name}
                  </p>
                  <p className="text-[10px] text-zinc-600 leading-relaxed mb-2">{domain.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden max-w-[60px]">
                      {hasMastery && (
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500"}`} />
                      )}
                    </div>
                    <span className={`text-[10px] ${hasMastery ? (pct >= 70 ? "text-green-400" : pct >= 40 ? "text-yellow-400" : "text-red-400") : "text-zinc-700"}`}>
                      {hasMastery ? `${pct}%` : "--"}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right: Config panel */}
        <div className="space-y-6">

          {/* Difficulty */}
          <div className="glass rounded-lg p-5 border border-zinc-700/40">
            <p className="font-mono text-[10px] text-zinc-500 tracking-widest mb-4">DIFFICULTY LEVEL</p>
            <div className="space-y-2">
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.id;
                return (
                  <motion.button key={d.id} onClick={() => setDifficulty(d.id)}
                    whileHover={{ x: 4 }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all font-mono ${
                      active ? `${d.border} bg-blue-500/5` : "border-zinc-800/30 hover:border-zinc-600/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold tracking-wider ${active ? d.color : "text-zinc-400"}`}>
                        {d.label}
                      </span>
                      {active && <span className="text-[10px] text-blue-400">◀</span>}
                    </div>
                    <p className={`text-[10px] tracking-wider ${active ? "text-zinc-500" : "text-zinc-700"}`}>{d.sub}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Modifiers */}
          <div className="glass rounded-lg p-5 border border-zinc-700/40">
            <p className="font-mono text-[10px] text-zinc-500 tracking-widest mb-4">MISSION MODIFIERS</p>
            <div className="space-y-2">
              {MODIFIERS.map((m) => {
                const active = modifiers.includes(m.id);
                return (
                  <motion.button key={m.id} onClick={() => toggleModifier(m.id)}
                    whileHover={{ x: 4 }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all font-mono ${
                      active ? "border-purple-500/40 bg-purple-500/5" : "border-zinc-800/30 hover:border-zinc-600/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                          active ? "bg-purple-500 border-purple-500" : "border-zinc-600"
                        }`}>
                          {active && <span className="text-black text-[8px] font-bold">✓</span>}
                        </div>
                        <span className={`text-xs font-bold tracking-wider ${active ? "text-purple-300" : "text-zinc-400"}`}>
                          {m.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-green-500/70">{m.bonus}</span>
                    </div>
                    <p className="text-[10px] text-zinc-700 mt-1 ml-5.5">{m.desc}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Threat + XP Summary */}
          <div className="glass rounded-lg p-5 border border-zinc-700/40">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-[10px] text-zinc-500 tracking-widest">THREAT LEVEL</span>
                  <span className={`font-mono text-xs font-bold tracking-wider ${threatLevel.color}`}>
                    {threatLevel.label}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    key={threatLevel.label}
                    initial={{ width: 0 }}
                    animate={{ width: threatLevel.bar.match(/w-(\d+\/\d+|full)/)?.[0] === "full" ? "100%" : `${(parseInt(threatLevel.bar.match(/(\d+)/)?.[1] || "1") / 6) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-full ${threatLevel.bar.split(" ")[1] || "bg-yellow-500"}`}
                  />
                </div>
              </div>

              <div className="h-px bg-zinc-800" />

              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-zinc-500 tracking-widest">ESTIMATED XP</span>
                <span className="font-mono text-sm font-bold text-green-400">{estimatedXp.toLocaleString()} XP</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-zinc-500 tracking-widest">DOMAINS</span>
                <span className="font-mono text-xs text-blue-400">{selectedDomains.length} / 6</span>
              </div>
            </div>
          </div>

          {/* Launch */}
          <motion.button
            onClick={handleStart}
            disabled={selectedDomains.length === 0 || starting}
            whileHover={selectedDomains.length > 0 ? { scale: 1.02 } : {}}
            whileTap={selectedDomains.length > 0 ? { scale: 0.98 } : {}}
            className={`w-full py-5 font-mono text-sm tracking-widest rounded-lg border transition-all duration-300 ${
              selectedDomains.length === 0
                ? "bg-zinc-900/50 border-zinc-800/30 text-zinc-700 cursor-not-allowed"
                : "bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30 hologram-btn-blue"
            }`}
          >
            {starting ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
                  GENERATING MISSION...
                </motion.span>
              </span>
            ) : (
              "INITIATE OPERATION"
            )}
          </motion.button>

          {onBack && (
            <button onClick={onBack}
              className="w-full py-2 font-mono text-[10px] tracking-widest text-zinc-700 hover:text-zinc-500 transition-colors">
              ABORT MISSION
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}