import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useAOSStore } from "@/stores/aosStore";
import { useTacticalStore } from "@/stores/tacticalStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";
import TacticalHUD from "@/components/aos/TacticalHUD";
import { ArchiveScanPanel, ThreatPredictionPanel, MemoryRecallPanel, OverclockWarning } from "@/components/aos/TacticalEffectPanel";
import { useSubmitAnswer } from "@workspace/api-client-react";
import { useSound } from "@/hooks/useSound";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import MissionConfig from "@/components/mission/MissionConfig";
import { getToken } from "@/lib/auth";
import { useTacticalAI } from "@/hooks/useTacticalAI";

const BASE_URL = import.meta.env.VITE_API_URL || "";

type MissionQuestion = {
  id: number; type: string; questionText: string; difficulty: number;
  category: string; mediaUrl?: string | null;
  options: { id: number; text: string }[]; timeLimit: number;
};

type MissionData = {
  missionId: number; threatLevel: string; threatLabel: string;
  estimatedXp: number; archiveMode: boolean;
  difficulty: string; timerMultiplier: number; xpMultiplier: number;
  questions: MissionQuestion[]; totalQuestions: number;
};

type AnswerState = { optionId: number; correct: boolean; xpGained: number; explanation: string } | null;

type PagePhase = "boot" | "config" | "brief" | "playing" | "gameover";

function TimerRing({ timeLeft, total }: { timeLeft: number; total: number }) {
  const pct = timeLeft / total;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = pct > 0.5 ? "#3b82f6" : pct > 0.25 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 0.3 }} />
      </svg>
      <motion.span animate={{ color }} className="absolute font-mono text-xl font-bold">{timeLeft}</motion.span>
    </div>
  );
}

const BOOT_STEPS = [
  { text: "INITIALIZING MISSION PROTOCOL...", delay: 400, speed: 25 },
  { text: "LOADING ARCHIVE INTELLIGENCE... OK", delay: 500, speed: 20 },
  { text: "ARMING OPERATION MODULES...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

const THREAT_COLORS: Record<string, string> = {
  LOW: "text-green-400 border-green-500/30",
  MODERATE: "text-yellow-400 border-yellow-500/30",
  HIGH: "text-orange-400 border-orange-500/30",
  SEVERE: "text-red-400 border-red-500/30",
  CRITICAL: "text-purple-400 border-purple-500/30",
};

export default function PlayPage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted, addAlert } = useAOSStore();
  const { play: playSound } = useSound();
  const tacticalStore = useTacticalStore();

  const [phase, setPhase] = useState<PagePhase>("boot");
  const [mission, setMission] = useState<MissionData | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [streak, setStreak] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: number; correct: boolean; timeSpentMs: number }[]>([]);
  const [missionResult, setMissionResult] = useState<any>(null);

  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<number[]>([]);
  const [hintData, setHintData] = useState<{ hint: string; category: string } | null>(null);
  const [predictionData, setPredictionData] = useState<{ category: string; confidence: string } | null>(null);
  const [recallData, setRecallData] = useState<string | null>(null);
  const [overclockData, setOverclockData] = useState<{ timerMult: number; xpMult: number } | null>(null);
  const [streakProtected, setStreakProtected] = useState(false);
  const [xpBoostActive, setXpBoostActive] = useState(false);
  const [extraTime, setExtraTime] = useState(0);
  const [moduleLocked, setModuleLocked] = useState(false);
  const [ghostUsed, setGhostUsed] = useState(false);
  const [tacticalDisabled, setTacticalDisabled] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("play");
    setPhase("config");
  }, [setBooted]);

  useEffect(() => {
    if (booted["play"]) { setBootDone(true); setPhase("config"); }
  }, [booted]);

  function handleStartMission(data: MissionData) {
    setMission(data);
    setPhase("brief");
    setTimeout(() => setPhase("playing"), 2500);
  }

  const question = mission?.questions?.[qIndex];
  const baseTimeLimit = question?.timeLimit || 30;
  const effectiveTimeLimit = baseTimeLimit + extraTime;

  useTacticalAI({
    timeLeft,
    totalTime: effectiveTimeLimit,
    streak,
    answerState,
    questionCategory: question?.category,
    eliminatedOptionIds,
    extraTime,
  });

  const submitMutation = useSubmitAnswer({});

  const handleTimeout = useCallback(() => {
    if (answerState) return;
    const a = { questionId: question?.id || 0, correct: false, timeSpentMs: effectiveTimeLimit * 1000 };
    setAnswers((prev) => [...prev, a]);
    setAnswerState({ optionId: -1, correct: false, xpGained: 0, explanation: "Time expired. The archive records this failure." });
    if (streakProtected && !ghostUsed) {
      setGhostUsed(true);
      addAlert({ message: "GHOST PROTOCOL: STREAK PRESERVED", severity: "low" });
    } else {
      setStreak(0);
    }
    playSound("failure");
  }, [answerState, question, effectiveTimeLimit, playSound, streakProtected, ghostUsed, addAlert]);

  useEffect(() => {
    if (answerState || phase !== "playing" || !question) return;
    setTimeLeft(effectiveTimeLimit);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); handleTimeout(); return 0; }
        return t - 1;
      });
    }, overclockData ? Math.round(1000 * overclockData.timerMult) : 1000);
    return () => clearInterval(interval);
  }, [qIndex, question, answerState, phase, effectiveTimeLimit, handleTimeout, overclockData]);

  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0) playSound("timerWarning");
  }, [timeLeft, playSound]);

  function handleAnswer(optionId: number) {
    if (answerState || !question) return;
    setSelectedOption(optionId);
    const timeSpentMs = (effectiveTimeLimit - timeLeft) * 1000;

    submitMutation.mutate(
      { questionId: question.id, data: { optionId, timeSpentMs } },
      {
        onSuccess(result) {
          const correct = result.correct;
          setAnswers((prev) => [...prev, { questionId: question.id, correct, timeSpentMs }]);

          // Apply XP multipliers
          let xpGained = result.xpGained || 0;
          if (correct && xpBoostActive) xpGained = Math.round(xpGained * 1.25);
          if (correct && overclockData) xpGained = Math.round(xpGained * overclockData.xpMult);

          setAnswerState({ optionId, correct, xpGained, explanation: result.explanation || "" });

          if (correct) {
            setStreak((s) => s + 1);
            setTotalXp((x) => x + xpGained);
            playSound("success");
          } else {
            if (streakProtected && !ghostUsed) {
              setGhostUsed(true);
              addAlert({ message: "GHOST PROTOCOL: STREAK PRESERVED", severity: "low" });
            } else {
              setStreak(0);
            }
            playSound("failure");
          }
          setTacticalDisabled(true);
        },
      }
    );
  }

  function nextQuestion() {
    if (!mission) return;
    if (qIndex >= mission.questions.length - 1) {
      completeMission();
    } else {
      setQIndex((i) => i + 1);
      setAnswerState(null);
      setSelectedOption(null);
      setEliminatedOptionIds([]);
      setHintData(null);
      setPredictionData(null);
      setRecallData(null);
      setOverclockData(null);
      setXpBoostActive(false);
      setExtraTime(0);
      setModuleLocked(false);
      setTacticalDisabled(false);
      tacticalStore.clearEffects();
      tacticalStore.setModuleLocked(false);
      tacticalStore.setSuggestedModule(null);
    }
  }

  async function completeMission() {
    const token = getToken();
    try {
      const res = await fetch(`${BASE_URL}/api/mission/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ missionId: mission?.missionId, answers }),
      });
      const data = await res.json();
      setMissionResult(data);
    } catch { /* ignore */ }
    setPhase("gameover");
  }

  function restart() {
    playSound("click");
    setPhase("config");
    setMission(null);
    setQIndex(0);
    setAnswerState(null);
    setSelectedOption(null);
    setStreak(0);
    setTotalXp(0);
    setAnswers([]);
    setMissionResult(null);
    setEliminatedOptionIds([]);
    setHintData(null);
    setPredictionData(null);
    setRecallData(null);
    setOverclockData(null);
    setXpBoostActive(false);
    setExtraTime(0);
    setStreakProtected(false);
    setGhostUsed(false);
    setModuleLocked(false);
    setTacticalDisabled(false);
    tacticalStore.clearEffects();
    tacticalStore.setModuleLocked(false);
    tacticalStore.setSuggestedModule(null);
  }

  function handleModuleEffect(effect: any) {
    switch (effect.type) {
      case "eliminate_wrong":
        setEliminatedOptionIds(effect.eliminatedOptionIds || []);
        break;
      case "add_time":
        setExtraTime(effect.extraSeconds || 10);
        setTimeLeft((t) => t + (effect.extraSeconds || 10));
        break;
      case "reveal_hint":
        setHintData({ hint: effect.hint, category: effect.questionCategory });
        break;
      case "protect_streak":
        setStreakProtected(true);
        break;
      case "xp_boost":
        setXpBoostActive(true);
        break;
      case "predict_next":
        setPredictionData({ category: effect.predictedCategory, confidence: effect.confidence });
        break;
      case "show_similar":
        setRecallData(effect.similarQuestion);
        break;
      case "risk_reward":
        setOverclockData({ timerMult: effect.timerMultiplier || 0.6, xpMult: effect.xpMultiplier || 3.0 });
        break;
    }
  }

  // Boot phase
  if (phase === "boot") {
    return (
      <>
        <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="play" alreadyBooted={bootDone} />
        <AOSLayout>
          <NavBar />
          <div className="pt-14 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="font-mono text-sm text-blue-400 tracking-widest">
                INITIALIZING...
              </motion.div>
            </div>
          </div>
        </AOSLayout>
      </>
    );
  }

  // Config phase
  if (phase === "config") {
    return (
      <>
        <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="play" alreadyBooted={true} />
        <AOSLayout>
          <NavBar />
          <div className="pt-14 min-h-screen">
            <MissionConfig onStartMission={handleStartMission} />
          </div>
        </AOSLayout>
      </>
    );
  }

  // Brief phase
  if (phase === "brief" && mission) {
    const threatClass = THREAT_COLORS[mission.threatLabel] || THREAT_COLORS.MODERATE;
    return (
      <>
        <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="play" alreadyBooted={true} />
        <AOSLayout>
          <NavBar />
          <div className="pt-14 min-h-screen flex items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-lg mx-auto">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="font-mono text-xs text-zinc-500 tracking-widest mb-4">MISSION GENERATED</motion.p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="font-mono text-3xl font-black text-zinc-100 mb-4">
                OPERATION <span className="text-blue-400 neon-text-blue">ACTIVE</span>
              </motion.h1>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="glass rounded-lg p-6 border border-zinc-700/40 space-y-3">
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-zinc-600 tracking-widest">DIFFICULTY</span>
                  <span className="font-mono text-xs font-bold text-blue-400">{mission.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-zinc-600 tracking-widest">THREAT LEVEL</span>
                  <span className={`font-mono text-xs font-bold ${threatClass.split(" ")[0]}`}>{mission.threatLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-zinc-600 tracking-widest">TARGET XP</span>
                  <span className="font-mono text-xs font-bold text-green-400">{mission.estimatedXp} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-zinc-600 tracking-widest">QUESTIONS</span>
                  <span className="font-mono text-xs text-zinc-300">{mission.totalQuestions}</span>
                </div>
                {mission.archiveMode && (
                  <div className="pt-2 border-t border-zinc-800">
                    <p className="font-mono text-[10px] text-amber-400 tracking-widest">
                      ⚠ ARCHIVE RECONSTRUCTION MODE ACTIVE
                    </p>
                  </div>
                )}
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                className="font-mono text-xs text-zinc-700 mt-6 tracking-widest animate-pulse">
                LOADING OPERATION...
              </motion.p>
            </motion.div>
          </div>
        </AOSLayout>
      </>
    );
  }

  // Game Over phase
  if (phase === "gameover") {
    return (
      <>
        <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="play" alreadyBooted={true} />
        <AOSLayout>
          <NavBar />
          <div className="pt-14 flex items-center justify-center min-h-screen">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-strong cipher-border rounded-lg p-10 max-w-md w-full mx-4 text-center">
              <p className="font-mono text-xs text-zinc-500 tracking-widest mb-2">OPERATION COMPLETE</p>
              <h1 className="font-mono text-4xl font-black text-blue-400 neon-text-blue mb-6">DEBRIEFING</h1>

              {missionResult && (
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between glass rounded-lg p-3">
                    <span className="font-mono text-xs text-zinc-500">ACCURACY</span>
                    <span className="font-mono text-sm font-bold text-blue-400">{missionResult.accuracy}%</span>
                  </div>
                  <div className="flex justify-between glass rounded-lg p-3">
                    <span className="font-mono text-xs text-zinc-500">CORRECT</span>
                    <span className="font-mono text-sm font-bold text-green-400">{missionResult.correctCount}/{missionResult.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between glass rounded-lg p-3">
                    <span className="font-mono text-xs text-zinc-500">TOTAL XP</span>
                    <span className="font-mono text-sm font-bold text-green-400">+{missionResult.totalXp}</span>
                  </div>
                  <div className="flex justify-between glass rounded-lg p-3">
                    <span className="font-mono text-xs text-zinc-500">PEAK STREAK</span>
                    <span className="font-mono text-sm font-bold text-orange-400">{streak}</span>
                  </div>
                </div>
              )}

              <button onClick={restart}
                className="w-full py-4 font-mono text-sm tracking-widest text-blue-300 glass cipher-border rounded-lg hover:bg-blue-500/10 transition-all neon-blue">
                NEW OPERATION
              </button>
            </motion.div>
          </div>
        </AOSLayout>
      </>
    );
  }

  // Playing phase
  if (!question) return null;

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="play" alreadyBooted={true} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">
          <div className="relative max-w-2xl mx-auto px-4 py-8">
            {/* HUD Bar */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between glass cipher-border rounded-lg px-5 py-3 mb-6">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-zinc-500">
                  Q<span className="text-blue-400">{qIndex + 1}</span>/{mission?.totalQuestions || "?"}
                </span>
                {mission && (
                  <span className="font-mono text-[10px] text-zinc-700 tracking-widest">{mission.difficulty}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {overclockData && (
                  <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.5, repeat: Infinity }}
                    className="font-mono text-[10px] text-red-400 border border-red-500/40 px-2 py-0.5 rounded">
                    OVERCLOCK {overclockData.xpMult}x XP
                  </motion.span>
                )}
                {xpBoostActive && (
                  <span className="font-mono text-[10px] text-green-400 border border-green-500/30 px-2 py-0.5 rounded">
                    BOOST 1.25x
                  </span>
                )}
                {streak > 0 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="font-mono text-xs text-orange-400 border border-orange-500/30 px-2 py-1 rounded">
                    {streak}x STREAK
                  </motion.div>
                )}
                <span className="font-mono text-xs text-green-400">+{totalXp} XP</span>
              </div>
            </motion.div>

            {/* Tactical Module HUD */}
            <TacticalHUD
              questionId={question.id}
              questionCategory={question.category}
              questionTimeLimit={effectiveTimeLimit}
              onEffectActivated={handleModuleEffect}
              disabled={tacticalDisabled}
            />

            {/* Effect Panels */}
            <ArchiveScanPanel hint={hintData?.hint || ""} category={hintData?.category || ""} visible={!!hintData} />
            <ThreatPredictionPanel predictedCategory={predictionData?.category || ""} confidence={predictionData?.confidence || ""} visible={!!predictionData} />
            <MemoryRecallPanel similarQuestion={recallData || ""} visible={!!recallData} />
            <OverclockWarning visible={!!overclockData} timerMultiplier={overclockData?.timerMult || 0.6} />

            {/* Question Card */}
            <AnimatePresence mode="wait">
              <motion.div key={qIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }} className="glass-strong cipher-border rounded-lg p-8 mb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono text-xs text-zinc-600 tracking-widest border border-zinc-700/50 px-2 py-1 rounded">
                        {question.category?.toUpperCase() || "INTEL"}
                      </span>
                      <span className="font-mono text-xs text-zinc-700">DIFFICULTY {question.difficulty}/10</span>
                    </div>
                  </div>
                  {!answerState && (
                    <div className="ml-6 flex-shrink-0">
                      <TimerRing timeLeft={timeLeft} total={effectiveTimeLimit} />
                    </div>
                  )}
                </div>
                <QuestionRenderer question={question} answerState={answerState}
                  selectedOption={selectedOption} onAnswer={handleAnswer} isPending={submitMutation.isPending}
                  eliminatedOptionIds={eliminatedOptionIds} />
              </motion.div>
            </AnimatePresence>

            {/* Answer Feedback */}
            <AnimatePresence>
              {answerState && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className={`glass-strong rounded-lg p-6 mb-4 border ${answerState.correct ? "border-green-500/40" : "border-red-500/40"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`font-mono text-sm font-bold tracking-widest ${answerState.correct ? "text-green-400" : "text-red-400"}`}>
                        {answerState.correct ? "CORRECT — INTEL CONFIRMED" : answerState.optionId === -1 ? "TIME EXPIRED" : "INCORRECT — REVIEW REQUIRED"}
                      </p>
                      {answerState.xpGained > 0 && (
                        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="font-mono text-xs text-green-400 mt-1">+{answerState.xpGained} XP</motion.p>
                      )}
                    </div>
                  </div>
                  <p className="font-mono text-xs text-zinc-400 leading-relaxed">{answerState.explanation}</p>
                  <button onClick={nextQuestion}
                    className="mt-4 w-full py-3 font-mono text-xs tracking-widest text-blue-300 glass cipher-border rounded hover:bg-blue-500/10 transition-all">
                    {qIndex >= (mission?.questions.length || 0) - 1 ? "COMPLETE MISSION" : "NEXT QUESTION"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </AOSLayout>
    </>
  );
}
