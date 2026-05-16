import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTacticalStore, type ModuleDef } from "@/stores/tacticalStore";
import { useAOSStore } from "@/stores/aosStore";
import { getToken } from "@/lib/auth";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const FALLBACK_MODULES: ModuleDef[] = [
  { id: "signal_trace", name: "Signal Trace", description: "Eliminates 2 wrong answers", energyCost: 1, category: "assist", rarity: "common" },
  { id: "time_dilation", name: "Time Dilation", description: "+10 seconds to timer", energyCost: 2, category: "time", rarity: "common" },
  { id: "archive_scan", name: "Archive Scan", description: "Reveals contextual hint", energyCost: 1, category: "hint", rarity: "common" },
  { id: "ghost_protocol", name: "Ghost Protocol", description: "Protects streak once", energyCost: 3, category: "defense", rarity: "rare" },
  { id: "neural_boost", name: "Neural Boost", description: "+25% XP this question", energyCost: 2, category: "xp", rarity: "uncommon" },
  { id: "threat_prediction", name: "Threat Prediction", description: "Predicts next category", energyCost: 1, category: "intel", rarity: "uncommon" },
  { id: "memory_recall", name: "Memory Recall", description: "Shows similar past question", energyCost: 2, category: "hint", rarity: "rare" },
  { id: "overclock", name: "Overclock", description: "Compresses timer, triples XP", energyCost: 5, category: "risk", rarity: "epic" },
];

const FALLBACK_OWNED: Record<string, number> = {
  signal_trace: 3, time_dilation: 2, archive_scan: 3,
  ghost_protocol: 1, neural_boost: 2, threat_prediction: 2,
  memory_recall: 1, overclock: 0,
};

const MODULE_ICONS: Record<string, string> = {
  signal_trace: "📡",
  time_dilation: "⏳",
  archive_scan: "📖",
  ghost_protocol: "👻",
  neural_boost: "🧬",
  threat_prediction: "🎯",
  memory_recall: "💾",
  overclock: "⚠️",
};

const RARITY_COLORS: Record<string, string> = {
  common: "border-zinc-700/60 text-zinc-400",
  uncommon: "border-green-700/60 text-green-400",
  rare: "border-blue-700/60 text-blue-400",
  epic: "border-purple-700/60 text-purple-400",
};

interface TacticalHUDProps {
  questionId?: number;
  questionCategory?: string;
  questionTimeLimit?: number;
  onEffectActivated?: (effect: any) => void;
  disabled?: boolean;
}

export default function TacticalHUD({
  questionId,
  questionCategory,
  questionTimeLimit,
  onEffectActivated,
  disabled,
}: TacticalHUDProps) {
  const {
    modules, owned, tacticalEnergy, maxEnergy,
    setModules, setEnergy, consumeModule, addEffect, setModuleLocked,
    activeEffects, moduleLocked, suggestedModule, setSuggestedModule,
  } = useTacticalStore();
  const { addAlert, triggerGlitch } = useAOSStore();
  const [activating, setActivating] = useState<string | null>(null);
  const [showEffect, setShowEffect] = useState<{ moduleId: string; text: string } | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Fetch modules on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setModules(FALLBACK_MODULES, FALLBACK_OWNED, 10, 10);
      setFetchAttempted(true);
      return;
    }
    fetch(`${BASE_URL}/api/tactical/modules`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.modules) {
          setModules(data.modules, data.owned || FALLBACK_OWNED, data.tacticalEnergy ?? 10, data.maxEnergy ?? 10);
        } else {
          setModules(FALLBACK_MODULES, FALLBACK_OWNED, 10, 10);
        }
        setFetchAttempted(true);
      })
      .catch(() => {
        setModules(FALLBACK_MODULES, FALLBACK_OWNED, 10, 10);
        setFetchAttempted(true);
      });
  }, [setModules]);

  // Use fallback modules if store is empty after fetch attempt
  const displayModules = modules.length > 0 ? modules : fetchAttempted ? FALLBACK_MODULES : [];
  const displayOwned = Object.keys(owned).length > 0 ? owned : FALLBACK_OWNED;

  const activateModule = useCallback(async (moduleId: string) => {
    if (activating || disabled || !questionId) return;
    setActivating(moduleId);

    const def = displayModules.find((m) => m.id === moduleId);
    const newEnergy = Math.max(0, tacticalEnergy - (def?.energyCost || 1));

    const tryApi = async (): Promise<any | null> => {
      try {
        const token = getToken();
        if (!token) return null;
        const res = await fetch(`${BASE_URL}/api/tactical/activate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ moduleId, questionId, questionCategory, questionTimeLimit }),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    const data = await tryApi();

    if (!data || !data.success) {
      // Local simulation mode (API unreachable) — apply effect locally
      const localEffects: Record<string, any> = {
        signal_trace: { type: "eliminate_wrong", moduleId, eliminatedOptionIds: [] },
        time_dilation: { type: "add_time", moduleId, extraSeconds: 10 },
        archive_scan: { type: "reveal_hint", moduleId, hint: "ARCHIVE OFFLINE — Using cached intelligence.", questionCategory: questionCategory || "general" },
        ghost_protocol: { type: "protect_streak", moduleId, streakProtected: true },
        neural_boost: { type: "xp_boost", moduleId, multiplier: 1.25, riskNote: "Local mode — XP bonus active." },
        threat_prediction: { type: "predict_next", moduleId, predictedCategory: questionCategory || "unknown", confidence: "N/A — OFFLINE" },
        memory_recall: { type: "show_similar", moduleId, similarQuestion: "ARCHIVE OFFLINE — Memory recall unavailable." },
        overclock: { type: "risk_reward", moduleId, timerMultiplier: 0.6, xpMultiplier: 3.0, warning: "LOCAL OVERCLOCK — SYSTEM UNSTABLE" },
      };

      const effect = localEffects[moduleId] || { type: "unknown", moduleId };

      setEnergy(newEnergy);
      consumeModule(moduleId);
      setModuleLocked(true);
      setShowEffect({ moduleId, text: `${MODULE_ICONS[moduleId] || ""} ${effect.type}` });

      triggerGlitch(0.3);
      addAlert({ message: `TACTICAL MODULE: ${moduleId.replace("_", " ").toUpperCase()} DEPLOYED (LOCAL)`, severity: "low" });

      addEffect({ moduleId, type: effect.type, data: effect, appliedAt: Date.now() });
      if (onEffectActivated) onEffectActivated(effect);

      setTimeout(() => {
        setShowEffect(null);
        setActivating(null);
      }, 2500);
      return;
    }

    // API success path
    setEnergy(data.energyRemaining);
    consumeModule(moduleId);
    setModuleLocked(true);
    setShowEffect({ moduleId, text: `${MODULE_ICONS[moduleId] || ""} ${data.effect.type}` });

    triggerGlitch(0.3);
    addAlert({ message: `TACTICAL MODULE: ${moduleId.replace("_", " ").toUpperCase()} DEPLOYED`, severity: "low" });

    addEffect({ moduleId, type: data.effect.type, data: data.effect, appliedAt: Date.now() });
    if (onEffectActivated) onEffectActivated(data.effect);

    setTimeout(() => {
      setShowEffect(null);
      setActivating(null);
    }, 2500);
  }, [activating, disabled, questionId, questionCategory, questionTimeLimit, onEffectActivated, addAlert, triggerGlitch, setEnergy, consumeModule, setModuleLocked, addEffect, displayModules, tacticalEnergy]);

  useEffect(() => {
    if (!expanded) return;
    const t = setTimeout(() => setExpanded(false), 8000);
    return () => clearTimeout(t);
  }, [expanded]);

  useEffect(() => {
    if (!suggestedModule) return;
    const t = setTimeout(() => setSuggestedModule(null), 8000);
    return () => clearTimeout(t);
  }, [suggestedModule, setSuggestedModule]);

  if (!displayModules.length) return null;

  return (
    <>
      <AnimatePresence>
        {showEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="font-mono text-2xl font-black text-blue-400 tracking-widest neon-text-blue"
            >
              {showEffect.text}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ height: expanded ? "auto" : 44 }}
        className="relative"
      >
        <div className="glass border-t border-b border-blue-900/30">
          <div className="max-w-2xl mx-auto px-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between py-2 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400"
                />
                <span className="font-mono text-[10px] text-zinc-600 tracking-widest">
                  TACTICAL MODULES
                </span>
                <span className="font-mono text-[10px] text-blue-400/80">
                  EN {tacticalEnergy}/{maxEnergy}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeEffects.length > 0 && (
                  <span className="font-mono text-[10px] text-green-500/80">{activeEffects.length} ACTIVE</span>
                )}
                <span className="font-mono text-[10px] text-zinc-700">{expanded ? "▲" : "▼"}</span>
              </div>
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-4 gap-2 pb-3">
                    {displayModules.map((mod) => {
                      const qty = displayOwned[mod.id] ?? 0;
                      const hasEnoughEnergy = tacticalEnergy >= mod.energyCost;
                      const canUse = qty > 0 && hasEnoughEnergy && !moduleLocked && !disabled && !!questionId;
                      const isActive = activeEffects.some((e) => e.moduleId === mod.id);
                      const isSuggested = suggestedModule === mod.id;

                      let cls = "relative rounded border font-mono text-center transition-all duration-200 p-2 cursor-pointer ";
                      cls += RARITY_COLORS[mod.rarity] || RARITY_COLORS.common;
                      if (isActive) {
                        cls += " bg-green-500/10 border-green-500/60";
                      } else if (isSuggested) {
                        cls += " bg-amber-500/10 border-amber-500/60 animate-pulse";
                      } else if (!canUse) {
                        cls += " opacity-40 cursor-not-allowed";
                      } else {
                        cls += " hover:bg-blue-500/10 hover:border-blue-500/40";
                      }

                      return (
                        <motion.button
                          key={mod.id}
                          whileTap={canUse ? { scale: 0.95 } : {}}
                          onClick={() => canUse && activateModule(mod.id)}
                          disabled={!canUse || !!activating}
                          className={cls}
                          title={`${mod.name}: ${mod.description} (Cost: ${mod.energyCost} EN)`}
                        >
                          <div className="text-lg">{MODULE_ICONS[mod.id] || "🔧"}</div>
                          <div className="font-mono text-[8px] tracking-widest mt-0.5 truncate">
                            {mod.name}
                          </div>
                          <div className="font-mono text-[8px] text-zinc-700 mt-0.5">
                            {qty}x | {mod.energyCost}EN
                          </div>
                          {activating === mod.id && (
                            <motion.div
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                              className="absolute inset-0 bg-blue-500/10 rounded"
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}

let modulesFetchPromise: Promise<void> | null = null;

export function prefetchTacticalModules() {
  if (modulesFetchPromise) return modulesFetchPromise;
  const token = getToken();
  if (!token) {
    useTacticalStore.getState().setModules(FALLBACK_MODULES, FALLBACK_OWNED, 10, 10);
    return Promise.resolve();
  }
  modulesFetchPromise = fetch(`${BASE_URL}/api/tactical/modules`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.modules) {
        useTacticalStore.getState().setModules(data.modules, data.owned || FALLBACK_OWNED, data.tacticalEnergy ?? 10, data.maxEnergy ?? 10);
      }
    })
    .catch(() => {
      useTacticalStore.getState().setModules(FALLBACK_MODULES, FALLBACK_OWNED, 10, 10);
    });
  return modulesFetchPromise;
}
