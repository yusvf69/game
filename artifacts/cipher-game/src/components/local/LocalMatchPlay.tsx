import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalMatchStore } from "@/stores/localMatchStore";
import LocalMatchScoreboard from "./LocalMatchScoreboard";
import LocalCategoryIntro from "./LocalCategoryIntro";
import TeamLoadout from "@/components/team/TeamLoadout";
import TeamScoreboard from "@/components/team/TeamScoreboard";

const COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6", red: "#ef4444", green: "#10b981",
  purple: "#8b5cf6", amber: "#f59e0b", cyan: "#06b6d4",
  pink: "#ec4899", orange: "#f97316",
};

const MODULE_ICONS: Record<string, string> = {
  signal_trace: "📡", time_dilation: "⏳", archive_scan: "📖",
  ghost_protocol: "👻", neural_boost: "🧬", threat_prediction: "🎯",
  memory_recall: "💾", overclock: "⚠️",
};

export default function LocalMatchPlay() {
  const store = useLocalMatchStore();
  const question = store.getCurrentQuestion();
  const team = store.getCurrentTeam();
  const teamColorHex = COLOR_HEX[team?.color || "blue"] || "#3b82f6";

  const [timeLeft, setTimeLeft] = useState(30);
  const [timeTotal, setTimeTotal] = useState(30);
  const [answered, setAnswered] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCategoryIntro, setShowCategoryIntro] = useState(false);
  const [categoryIntroDone, setCategoryIntroDone] = useState(false);
  const [pickingAnswer, setPickingAnswer] = useState(false);

  // Category intro on first question or new domain in sequential mode
  useEffect(() => {
    if (store.currentQuestionIndex === 0 || (store.flowMode === "sequential" && question && !categoryIntroDone)) {
      setShowCategoryIntro(true);
    } else {
      setCategoryIntroDone(true);
    }
  }, [store.currentQuestionIndex, question?.category]);

  // Timer
  useEffect(() => {
    if (answered || showFeedback || showCategoryIntro || !question) return;
    const limit = question.timeLimit || 30;
    setTimeTotal(limit);
    setTimeLeft(limit);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [store.currentQuestionIndex, store.currentTeamIndex, answered, showCategoryIntro]);

  const handleTimeout = useCallback(() => {
    if (answered) return;
    setAnswered(true);
    setShowFeedback(true);
    store.markAnswer(false, timeTotal * 1000);
  }, [answered, timeTotal, store]);

  function handleSelectOption(optionId: number) {
    if (answered || showFeedback) return;
    setPickingAnswer(true);
    store.setSelectedOption(optionId);
    const timeMs = (timeTotal - timeLeft) * 1000;

    // Determine correct answer from options
    // In local mode we need the correct option id, but for now simulate
    // This will be enhanced with API integration later
    const isCorrect = true; // Placeholder — will be checked via API
    store.markAnswer(isCorrect, timeMs);
    setAnswered(true);
    setShowFeedback(true);
  }

  function handleNext() {
    const { nextTeam, currentTeamIndex, teams, nextQuestion, currentQuestionIndex, questions } = store;
    const isLastTeam = currentTeamIndex >= teams.length - 1;
    if (answered) {
      if (isLastTeam) {
        nextQuestion();
      } else {
        nextTeam();
      }
      setAnswered(false);
      setShowFeedback(false);
      setPickingAnswer(false);
      setCategoryIntroDone(false);
    }
  }

  function handleUseAssist(moduleId: string) {
    if (answered || showFeedback) return;
    store.useAssist(moduleId);
    store.setActiveAssist(moduleId);

    // Apply assist effects locally
    if (moduleId === "signal_trace" && question) {
      const wrongOptionIds = question.options.slice(2, 4).map((o) => o.id);
      store.setEliminatedOptionIds(wrongOptionIds);
    }
    if (moduleId === "time_dilation") {
      setTimeLeft((t) => t + 10);
      setTimeTotal((t) => t + 10);
    }
  }

  const isEliminated = (optId: number) => store.eliminatedOptionIds?.includes(optId);

  if (!question) return null;

  // Category intro overlay
  if (showCategoryIntro && question) {
    return (
      <LocalCategoryIntro
        domain={question.category}
        teamColor={team?.color || "blue"}
        onComplete={() => {
          setShowCategoryIntro(false);
          setCategoryIntroDone(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: `${teamColorHex}08` }}>
      {/* Top bar — team turn indicator */}
      <motion.div
        animate={{ backgroundColor: `${teamColorHex}15` }}
        className="border-b py-3 px-4 flex items-center justify-between"
        style={{ borderColor: `${teamColorHex}40` }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ boxShadow: [`0 0 10px ${teamColorHex}44`, `0 0 25px ${teamColorHex}88`, `0 0 10px ${teamColorHex}44`] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: teamColorHex }}
          />
          <div>
            <span className="font-mono text-[10px] text-zinc-600 tracking-widest">CURRENT TEAM</span>
            <span className="font-mono text-lg font-bold ml-3" style={{ color: teamColorHex }}>
              {team?.name || "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-zinc-600">
            Q {store.currentQuestionIndex + 1}/{store.questions.length}
          </span>
          <span className="font-mono text-sm font-bold" style={{ color: timeLeft < 5 ? "#ef4444" : teamColorHex }}>
            {timeLeft}s
          </span>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Question */}
        <div className="flex-1 p-6">
          {/* Category */}
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[10px] text-zinc-600 tracking-widest border border-zinc-700/50 px-2 py-1 rounded">
              {question.category?.toUpperCase() || "INTEL"}
            </span>
            <span className="font-mono text-[10px] text-zinc-700">DIFFICULTY {question.difficulty}/10</span>
          </div>

          {/* Question text */}
          <motion.p
            key={store.currentQuestionIndex + "-" + store.currentTeamIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-mono text-lg text-zinc-100 leading-relaxed mb-6"
          >
            {question.questionText}
          </motion.p>

          {/* Options */}
          <AnimatePresence mode="wait">
            {!showFeedback ? (
              <motion.div
                key={`options-${store.currentQuestionIndex}-${store.currentTeamIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {question.options.map((opt) => {
                  const eliminated = isEliminated(opt.id);
                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={!answered ? { x: 4 } : {}}
                      onClick={() => handleSelectOption(opt.id)}
                      disabled={answered || eliminated}
                      className={`w-full text-left px-5 py-4 rounded-lg font-mono text-sm transition-all border ${
                        eliminated
                          ? "bg-red-950/10 border-red-900/30 text-red-900/50 line-through cursor-not-allowed"
                          : answered
                          ? "bg-zinc-900 border-zinc-800/30 text-zinc-700 cursor-default"
                          : "glass border-zinc-700/50 hover:border-blue-500/50 hover:bg-blue-500/5 text-zinc-200 cursor-pointer"
                      }`}
                    >
                      {eliminated && <span className="text-red-950/50 text-[10px] mr-2">[ELIMINATED]</span>}
                      {opt.text}
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className={`font-mono text-2xl font-black mb-2 ${true ? "text-green-400" : "text-red-400"}`}>
                  {true ? "✓ ACCESS GRANTED" : "✗ ACCESS DENIED"}
                </div>
                <div className="font-mono text-xs text-zinc-500 mb-2">
                  +{100} POINTS
                </div>
                <div className="font-mono text-xs text-zinc-700 mb-6">
                  {store.currentTeamIndex >= store.teams.length - 1
                    ? "NEXT QUESTION..."
                    : "NEXT TEAM..."}
                </div>
                <button onClick={handleNext}
                  className="px-8 py-3 font-mono text-xs tracking-widest hologram-btn-blue rounded-lg">
                  CONTINUE
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Team tactical modules */}
          {team && team.tacticalLoadout.length > 0 && !answered && (
            <div className="mt-6">
              <div className="font-mono text-[10px] text-zinc-600 tracking-widest mb-2">TACTICAL MODULES</div>
              <div className="flex gap-2">
                {team.tacticalLoadout.map((modId) => (
                  <button
                    key={modId}
                    onClick={() => handleUseAssist(modId)}
                    disabled={answered || showFeedback || store.activeAssist === modId}
                    className={`px-3 py-2 rounded border font-mono text-[10px] transition-all ${
                      store.activeAssist === modId
                        ? "bg-green-500/10 border-green-500/60 text-green-400"
                        : "glass border-zinc-700/50 hover:border-blue-500/40 text-zinc-400"
                    }`}
                  >
                    {MODULE_ICONS[modId] || "🔧"} {modId.replace("_", " ").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Scoreboard */}
        <div className="w-full lg:w-72 p-4 border-t lg:border-t-0 lg:border-l border-zinc-800/40">
          <LocalMatchScoreboard />

          {showFeedback && answered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 font-mono text-[10px] text-zinc-700 text-center"
            >
              Waiting for {store.currentTeamIndex >= store.teams.length - 1 ? "next question" : "next team"}...
            </motion.div>
          )}
        </div>
      </div>

      {/* Timer bar at bottom */}
      {!showFeedback && !answered && (
        <motion.div className="h-1" style={{ backgroundColor: `${teamColorHex}20` }}>
          <motion.div
            className="h-full"
            style={{ backgroundColor: timeLeft < 5 ? "#ef4444" : teamColorHex }}
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / timeTotal) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
    </div>
  );
}
