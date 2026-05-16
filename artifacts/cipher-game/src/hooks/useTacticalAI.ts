import { useEffect, useRef } from "react";
import { useTacticalStore } from "@/stores/tacticalStore";

interface UseTacticalAIOpts {
  timeLeft: number;
  totalTime: number;
  streak: number;
  answerState: any;
  questionCategory?: string;
  eliminatedOptionIds: number[];
  extraTime: number;
}

const MODULE_SUGGESTIONS: Record<string, { modules: string[]; message: string }> = {
  time_pressure: {
    modules: ["time_dilation", "signal_trace"],
    message: "AI DIRECTOR: Cognitive load detected. Signal Trace or Time Dilation recommended.",
  },
  struggling: {
    modules: ["archive_scan", "signal_trace"],
    message: "AI DIRECTOR: Performance variance detected. Archive Scan may assist.",
  },
  losing_streak: {
    modules: ["ghost_protocol", "archive_scan"],
    message: "AI DIRECTOR: Streak vulnerability identified. Ghost Protocol advised.",
  },
  generic_tip: {
    modules: ["archive_scan", "threat_prediction"],
    message: "AI DIRECTOR: Additional intel channels available. Consider deploying a tactical module.",
  },
};

function getSuggestionKey(streak: number, timeLeft: number, totalTime: number, eliminatedCount: number): string | null {
  const timePct = timeLeft / totalTime;
  if (timePct < 0.3 && totalTime > 10) return "time_pressure";
  if (streak === 0 && !eliminatedCount) return "struggling";
  if (streak === 0) return "losing_streak";
  return "generic_tip";
}

export function useTacticalAI({
  timeLeft,
  totalTime,
  streak,
  answerState,
  questionCategory,
  eliminatedOptionIds,
  extraTime,
}: UseTacticalAIOpts) {
  const lastSuggestionTime = useRef<number>(0);
  const lastSuggestionKey = useRef<string | null>(null);
  const { setSuggestedModule, owned, tacticalEnergy, modules, moduleLocked } = useTacticalStore();

  useEffect(() => {
    if (answerState || moduleLocked) return;
    if (!modules.length) return;

    const now = Date.now();
    if (now - lastSuggestionTime.current < 12000) return;

    const key = getSuggestionKey(streak, timeLeft, totalTime, eliminatedOptionIds.length);
    if (!key) return;
    if (key === lastSuggestionKey.current && streak > 0) return;

    const suggestion = MODULE_SUGGESTIONS[key];
    if (!suggestion) return;

    for (const modId of suggestion.modules) {
      const def = modules.find((m) => m.id === modId);
      if (!def) continue;
      const qty = owned[modId] || 0;
      if (qty > 0 && tacticalEnergy >= def.energyCost) {
        setSuggestedModule(modId);
        lastSuggestionTime.current = now;
        lastSuggestionKey.current = key;

        window.dispatchEvent(new CustomEvent("aos-director", {
          detail: { text: suggestion.message },
        }));
        return;
      }
    }
  }, [timeLeft, streak, answerState, eliminatedOptionIds, moduleLocked, modules, owned, tacticalEnergy, setSuggestedModule, totalTime]);
}
