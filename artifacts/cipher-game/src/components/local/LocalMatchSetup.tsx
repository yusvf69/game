import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalMatchStore, type TeamConfig } from "@/stores/localMatchStore";

const EMBLEMS = [
  { id: "default", icon: "🔰" }, { id: "crown", icon: "👑" }, { id: "skull", icon: "💀" },
  { id: "phoenix", icon: "🔥" }, { id: "wolf", icon: "🐺" }, { id: "eagle", icon: "🦅" },
  { id: "dragon", icon: "🐉" }, { id: "cyber", icon: "⚡" }, { id: "raven", icon: "🐦‍⬛" },
  { id: "ghost", icon: "👻" }, { id: "cipher", icon: "🔐" }, { id: "strike", icon: "⚔️" },
];

const COLORS = [
  { id: "blue", label: "NEON BLUE", hex: "#3b82f6" },
  { id: "red", label: "CRIMSON", hex: "#ef4444" },
  { id: "green", label: "EMERALD", hex: "#10b981" },
  { id: "purple", label: "VOID", hex: "#8b5cf6" },
  { id: "amber", label: "GOLD", hex: "#f59e0b" },
  { id: "cyan", label: "CYAN", hex: "#06b6d4" },
  { id: "pink", label: "NEON PINK", hex: "#ec4899" },
  { id: "orange", label: "BLAZE", hex: "#f97316" },
];

const DOMAIN_OPTIONS = [
  { id: "cyber_systems", name: "Cyber Systems", icon: "⚡" },
  { id: "cognitive_analysis", name: "Cognitive Analysis", icon: "🧠" },
  { id: "historical_archives", name: "Historical Archives", icon: "📜" },
  { id: "threat_intelligence", name: "Threat Intelligence", icon: "🛡️" },
  { id: "scientific_division", name: "Scientific Division", icon: "🔬" },
  { id: "behavioral_analysis", name: "Behavioral Analysis", icon: "🎭" },
  { id: "global_mapping", name: "Global Mapping", icon: "🌍" },
  { id: "cipher_division", name: "Cipher Division", icon: "🔐" },
];

const DIFFICULTIES = [
  { id: "recruit", label: "RECRUIT", mult: "×0.5 XP" },
  { id: "agent", label: "AGENT", mult: "×1.0 XP" },
  { id: "elite", label: "ELITE", mult: "×1.8 XP" },
  { id: "omega", label: "OMEGA", mult: "×3.0 XP" },
];

const MODULE_OPTIONS = [
  { id: "signal_trace", icon: "📡", name: "Signal Trace" },
  { id: "time_dilation", icon: "⏳", name: "Time Dilation" },
  { id: "archive_scan", icon: "📖", name: "Archive Scan" },
  { id: "ghost_protocol", icon: "👻", name: "Ghost Protocol" },
  { id: "neural_boost", icon: "🧬", name: "Neural Boost" },
  { id: "threat_prediction", icon: "🎯", name: "Threat Prediction" },
  { id: "memory_recall", icon: "💾", name: "Memory Recall" },
  { id: "overclock", icon: "⚠️", name: "Overclock" },
];

const TEAM_NAMES = ["NIGHT CROWS", "VOID PROTOCOL", "BLACK VEIL", "PHANTOM UNIT", "CYBER HIVE"];

export default function LocalMatchSetup() {
  const { setTeams, setDomains, setDifficulty, setFlowMode, setDomainOrder, startMatch, teams: storeTeams } = useLocalMatchStore();
  const [step, setStep] = useState<"count" | "config" | "domains" | "flow" | "loadout">("count");
  const [teamCount, setTeamCount] = useState(2);
  const [teams, setLocalTeams] = useState<TeamConfig[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [difficulty, setLocalDifficulty] = useState("agent");
  const [flowMode, setLocalFlowMode] = useState<"randomized" | "sequential">("randomized");
  const [domainOrder, setLocalDomainOrder] = useState<string[]>([]);

  function initTeams(count: number) {
    const t: TeamConfig[] = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: TEAM_NAMES[i] || `TEAM ${i + 1}`,
      color: COLORS[i % COLORS.length].id,
      emblem: EMBLEMS[i % EMBLEMS.length].id,
      tacticalLoadout: [],
    }));
    setLocalTeams(t);
    setTeamCount(count);
    setStep("config");
  }

  function updateTeam(index: number, updates: Partial<TeamConfig>) {
    setLocalTeams((prev) => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  }

  function toggleDomain(id: string) {
    setSelectedDomains((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : prev.length < 6 ? [...prev, id] : prev
    );
  }

  function toggleLoadout(teamIndex: number, moduleId: string) {
    setLocalTeams((prev) => prev.map((t, i) => {
      if (i !== teamIndex) return t;
      const loadout = t.tacticalLoadout.includes(moduleId)
        ? t.tacticalLoadout.filter((m) => m !== moduleId)
        : t.tacticalLoadout.length < 3 ? [...t.tacticalLoadout, moduleId] : t.tacticalLoadout;
      return { ...t, tacticalLoadout: loadout };
    }));
  }

  function handleStart() {
    if (selectedDomains.length === 0) return;
    setTeams(teams);
    setDomains(selectedDomains);
    setDifficulty(difficulty);
    setFlowMode(flowMode);
    if (flowMode === "sequential") {
      setDomainOrder(domainOrder.length > 0 ? domainOrder : selectedDomains);
    }
    startMatch();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Step 1: Team Count */}
        {step === "count" && (
          <motion.div key="count" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎮</div>
              <h2 className="font-mono text-2xl font-black text-zinc-100 mb-2">NUMBER OF TEAMS</h2>
              <p className="font-mono text-xs text-zinc-600">How many intelligence units will operate in this mission?</p>
            </div>
            <div className="flex justify-center gap-4">
              {[2, 3, 4, 5].map((n) => (
                <motion.button
                  key={n}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => initTeams(n)}
                  className="w-24 h-24 rounded-xl glass border border-zinc-700/40 hover:border-blue-500/40 flex flex-col items-center justify-center gap-1"
                >
                  <span className="font-mono text-3xl font-black text-blue-400">{n}</span>
                  <span className="font-mono text-[10px] text-zinc-600">TEAMS</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Team Configuration */}
        {step === "config" && (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono text-lg font-bold text-zinc-200">TEAM CONFIGURATION</h2>
              <button onClick={() => setStep("count")} className="font-mono text-xs text-zinc-600 hover:text-zinc-400">BACK</button>
            </div>

            <div className="space-y-4">
              {teams.map((team, i) => {
                const tc = COLORS.find((c) => c.id === team.color);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass rounded-lg p-5 border"
                    style={{ borderColor: `${tc?.hex}40` }}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <span className="font-mono text-xs text-zinc-600 w-16">TEAM {i + 1}</span>
                      <input
                        value={team.name}
                        onChange={(e) => updateTeam(i, { name: e.target.value })}
                        maxLength={20}
                        className="flex-1 bg-black/40 border border-zinc-700/60 rounded px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-700 focus:border-blue-500/60 focus:outline-none"
                        style={{ borderColor: team.name ? `${tc?.hex}60` : undefined }}
                      />
                    </div>

                    {/* Emblem selection */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[10px] text-zinc-600 w-16">EMBLEM</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {EMBLEMS.slice(0, 8).map((e) => (
                          <button
                            key={e.id}
                            onClick={() => updateTeam(i, { emblem: e.id })}
                            className={`w-9 h-9 rounded-lg text-base flex items-center justify-center transition-all ${
                              team.emblem === e.id
                                ? "bg-blue-500/10 border border-blue-500/60"
                                : "bg-black/20 border border-zinc-800/60 hover:border-zinc-600/60"
                            }`}
                          >
                            {e.icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color selection */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-600 w-16">COLOR</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {COLORS.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => updateTeam(i, { color: c.id })}
                            className="w-7 h-7 rounded-full transition-all"
                            style={{
                              backgroundColor: c.hex,
                              boxShadow: team.color === c.id ? `0 0 0 3px ${c.hex}88` : undefined,
                              opacity: team.color === c.id ? 1 : 0.5,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <button onClick={() => setStep("domains")}
              className="w-full mt-6 py-4 font-mono text-sm tracking-widest hologram-btn-blue rounded-lg">
              CONTINUE — SELECT DOMAINS
            </button>
          </motion.div>
        )}

        {/* Step 3: Domains */}
        {step === "domains" && (
          <motion.div key="domains" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono text-lg font-bold text-zinc-200">INTELLIGENCE DOMAINS</h2>
              <button onClick={() => setStep("config")} className="font-mono text-xs text-zinc-600 hover:text-zinc-400">BACK</button>
            </div>

            <p className="font-mono text-[10px] text-zinc-700 mb-4">Select 1–6 domains for this operation.</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {DOMAIN_OPTIONS.map((d) => {
                const isSelected = selectedDomains.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDomain(d.id)}
                    className={`rounded-lg p-4 border text-left transition-all ${
                      isSelected
                        ? "bg-blue-500/10 border-blue-500/60"
                        : "bg-black/20 border-zinc-800/60 hover:border-zinc-600/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{d.icon}</span>
                      <div>
                        <div className="font-mono text-xs text-zinc-300">{d.name}</div>
                        {isSelected && <div className="font-mono text-[10px] text-blue-400">SELECTED ✓</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <h3 className="font-mono text-xs text-zinc-500 mb-3">DIFFICULTY</h3>
              <div className="flex gap-3">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setLocalDifficulty(d.id)}
                    className={`flex-1 py-3 rounded-lg font-mono text-xs border transition-all ${
                      difficulty === d.id
                        ? "bg-blue-500/10 border-blue-500/60 text-blue-300"
                        : "bg-black/20 border-zinc-800/60 text-zinc-500 hover:border-zinc-600/60"
                    }`}
                  >
                    <div>{d.label}</div>
                    <div className="text-zinc-700">{d.mult}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep("flow")}
              disabled={selectedDomains.length === 0}
              className="w-full py-4 font-mono text-sm tracking-widest hologram-btn-blue rounded-lg disabled:opacity-30"
            >
              {selectedDomains.length === 0 ? "SELECT AT LEAST 1 DOMAIN" : `CONTINUE (${selectedDomains.length} DOMAINS)`}
            </button>
          </motion.div>
        )}

        {/* Step 4: Flow Mode */}
        {step === "flow" && (
          <motion.div key="flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono text-lg font-bold text-zinc-200">QUESTION FLOW</h2>
              <button onClick={() => setStep("domains")} className="font-mono text-xs text-zinc-600 hover:text-zinc-400">BACK</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setLocalFlowMode("randomized")}
                className={`rounded-lg p-6 border text-center transition-all ${
                  flowMode === "randomized"
                    ? "bg-blue-500/10 border-blue-500/60"
                    : "bg-black/20 border-zinc-800/60 hover:border-zinc-600/60"
                }`}
              >
                <div className="text-3xl mb-2">🔀</div>
                <div className="font-mono text-sm font-bold text-zinc-200 mb-1">RANDOMIZED</div>
                <div className="font-mono text-[10px] text-zinc-600">Questions from all domains mixed randomly</div>
              </button>

              <button
                onClick={() => setLocalFlowMode("sequential")}
                className={`rounded-lg p-6 border text-center transition-all ${
                  flowMode === "sequential"
                    ? "bg-blue-500/10 border-blue-500/60"
                    : "bg-black/20 border-zinc-800/60 hover:border-zinc-600/60"
                }`}
              >
                <div className="text-3xl mb-2">📋</div>
                <div className="font-mono text-sm font-bold text-zinc-200 mb-1">SEQUENTIAL</div>
                <div className="font-mono text-[10px] text-zinc-600">One domain at a time with category reveals</div>
              </button>
            </div>

            {flowMode === "sequential" && (
              <div className="mb-6">
                <h3 className="font-mono text-xs text-zinc-500 mb-3">DOMAIN ORDER</h3>
                <div className="space-y-2">
                  {selectedDomains.map((d, i) => {
                    const opt = DOMAIN_OPTIONS.find((o) => o.id === d);
                    return (
                      <div key={d} className="glass rounded-lg p-3 flex items-center gap-3 border border-zinc-800/40">
                        <span className="font-mono text-sm text-zinc-600 w-6">{i + 1}.</span>
                        <span className="text-lg">{opt?.icon}</span>
                        <span className="font-mono text-xs text-zinc-300 flex-1">{opt?.name || d}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              const order = [...selectedDomains];
                              if (i > 0) { [order[i], order[i - 1]] = [order[i - 1], order[i]]; setLocalDomainOrder(order); }
                            }}
                            className="px-2 py-1 font-mono text-[10px] text-zinc-600 hover:text-zinc-400 border border-zinc-800/40 rounded"
                          >▲</button>
                          <button
                            onClick={() => {
                              const order = [...selectedDomains];
                              if (i < order.length - 1) { [order[i], order[i + 1]] = [order[i + 1], order[i]]; setLocalDomainOrder(order); }
                            }}
                            className="px-2 py-1 font-mono text-[10px] text-zinc-600 hover:text-zinc-400 border border-zinc-800/40 rounded"
                          >▼</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={() => setStep("loadout")}
              className="w-full py-4 font-mono text-sm tracking-widest hologram-btn-blue rounded-lg">
              CONTINUE — TACTICAL LOADOUT
            </button>
          </motion.div>
        )}

        {/* Step 5: Tactical Loadout per team */}
        {step === "loadout" && (
          <motion.div key="loadout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono text-lg font-bold text-zinc-200">TACTICAL LOADOUT</h2>
              <button onClick={() => setStep("flow")} className="font-mono text-xs text-zinc-600 hover:text-zinc-400">BACK</button>
            </div>

            <p className="font-mono text-[10px] text-zinc-700 mb-4">Each team selects up to 3 tactical modules.</p>

            <div className="space-y-6">
              {teams.map((team, i) => {
                const tc = COLORS.find((c) => c.id === team.color);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass rounded-lg p-4 border"
                    style={{ borderColor: `${tc?.hex}30` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-sm font-bold" style={{ color: tc?.hex }}>{team.name}</span>
                      <span className="font-mono text-[10px] text-zinc-600">{team.tacticalLoadout.length}/3</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {MODULE_OPTIONS.map((mod) => {
                        const isSelected = team.tacticalLoadout.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            onClick={() => toggleLoadout(i, mod.id)}
                            className={`rounded p-2 text-center border transition-all ${
                              isSelected
                                ? "bg-blue-500/10 border-blue-500/60"
                                : "bg-black/20 border-zinc-800/60 hover:border-zinc-600/60"
                            }`}
                          >
                            <div className="text-lg">{mod.icon}</div>
                            <div className="font-mono text-[8px] text-zinc-400 truncate">{mod.name}</div>
                            {isSelected && <div className="font-mono text-[8px] text-blue-400">✓</div>}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <button onClick={handleStart}
              className="w-full mt-6 py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg">
              INITIATE OPERATION
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
