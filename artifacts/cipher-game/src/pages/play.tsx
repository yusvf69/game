import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useGetQuestions, useSubmitAnswer, getGetQuestionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type AnswerState = { optionId: number; correct: boolean; xpGained: number; explanation: string } | null;

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
        <motion.circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      <motion.span
        animate={{ color }}
        className="absolute font-mono text-xl font-bold"
      >
        {timeLeft}
      </motion.span>
    </div>
  );
}

export default function PlayPage() {
  const qc = useQueryClient();
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [streak, setStreak] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [gameOver, setGameOver] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const { data: questions, isLoading } = useGetQuestions(
    { limit: 5 },
    { query: { queryKey: getGetQuestionsQueryKey({ limit: 5 }) } }
  );

  const submitMutation = useSubmitAnswer();

  const question = questions?.[qIndex];
  const timeLimit = question?.timeLimit || 30;

  const handleTimeout = useCallback(() => {
    if (answerState) return;
    setAnswerState({ optionId: -1, correct: false, xpGained: 0, explanation: "Time expired. The archive records this failure." });
    setStreak(0);
  }, [answerState]);

  useEffect(() => {
    if (answerState || gameOver || !question) return;
    setTimeLeft(timeLimit);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qIndex, question, answerState, gameOver, timeLimit, handleTimeout]);

  function handleAnswer(optionId: number) {
    if (answerState || !question) return;
    setSelectedOption(optionId);
    const startMs = Date.now();
    submitMutation.mutate(
      { questionId: question.id, data: { optionId, timeSpentMs: (timeLimit - timeLeft) * 1000 } },
      {
        onSuccess(result) {
          setAnswerState({ optionId, correct: result.correct, xpGained: result.xpGained, explanation: result.explanation });
          if (result.correct) {
            setStreak((s) => s + 1);
            setTotalXp((x) => x + result.xpGained);
          } else {
            setStreak(0);
          }
          qc.invalidateQueries({ queryKey: getGetQuestionsQueryKey() });
        },
      }
    );
  }

  function nextQuestion() {
    if (!questions) return;
    if (qIndex >= questions.length - 1) {
      setGameOver(true);
    } else {
      setQIndex((i) => i + 1);
      setAnswerState(null);
      setSelectedOption(null);
    }
  }

  function restart() {
    setQIndex(0);
    setAnswerState(null);
    setSelectedOption(null);
    setGameOver(false);
    setStreak(0);
    setTotalXp(0);
    qc.invalidateQueries({ queryKey: getGetQuestionsQueryKey() });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="pt-14 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="font-mono text-sm text-blue-400 tracking-widest"
            >
              LOADING INTELLIGENCE BRIEF...
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="pt-14 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong cipher-border rounded-lg p-10 max-w-md w-full mx-4 text-center"
          >
            <div className="font-mono text-xs text-zinc-500 tracking-widest mb-2">OPERATION COMPLETE</div>
            <div className="font-mono text-4xl font-black text-blue-400 neon-text-blue mb-6">DEBRIEFING</div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="glass rounded-lg p-4">
                <p className="font-mono text-xs text-zinc-600 mb-1">TOTAL XP</p>
                <p className="font-mono text-2xl font-bold text-green-400">+{totalXp}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-mono text-xs text-zinc-600 mb-1">PEAK STREAK</p>
                <p className="font-mono text-2xl font-bold text-orange-400">{streak}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={restart}
                className="w-full py-4 font-mono text-sm tracking-widest text-blue-300 glass cipher-border rounded-lg hover:bg-blue-500/10 transition-all neon-blue"
                data-testid="play-again-btn"
              >
                RUN ANOTHER OPERATION
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const correctId = answerState
    ? question.options?.find((_, i) => i === (question.options?.findIndex((o: { id: number }) => o.id === answerState.optionId)))?.id
    : null;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="pt-14 min-h-screen">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 py-8">

          {/* HUD Bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between glass cipher-border rounded-lg px-5 py-3 mb-6"
          >
            <div className="font-mono text-xs text-zinc-500">
              QUESTION <span className="text-blue-400">{qIndex + 1}</span> / {questions?.length || 5}
            </div>
            <div className="flex items-center gap-4">
              {streak > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="font-mono text-xs text-orange-400 border border-orange-500/30 px-2 py-1 rounded"
                >
                  {streak}x STREAK
                </motion.div>
              )}
              <div className="font-mono text-xs text-green-400">+{totalXp} XP</div>
            </div>
          </motion.div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="glass-strong cipher-border rounded-lg p-8 mb-6"
            >
              {/* Timer + Meta */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-xs text-zinc-600 tracking-widest border border-zinc-700/50 px-2 py-1 rounded">
                      {question.category?.toUpperCase() || "INTEL"}
                    </span>
                    <span className="font-mono text-xs text-zinc-700">
                      DIFFICULTY {question.difficulty}/10
                    </span>
                  </div>
                  <p className="font-mono text-base text-zinc-100 leading-relaxed">{question.questionText}</p>
                </div>
                {!answerState && (
                  <div className="ml-6 flex-shrink-0">
                    <TimerRing timeLeft={timeLeft} total={timeLimit} />
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {question.options?.map((opt: { id: number; text: string }) => {
                  const isSelected = selectedOption === opt.id;
                  const isWrong = answerState && isSelected && !answerState.correct;

                  let cls = "w-full text-left px-5 py-4 rounded-lg font-mono text-sm transition-all duration-200 border ";
                  if (!answerState) {
                    cls += "glass border-zinc-700/50 hover:border-blue-500/50 hover:bg-blue-500/5 text-zinc-200 cursor-pointer";
                  } else if (isSelected && answerState.correct) {
                    cls += "bg-green-500/10 border-green-500/60 text-green-300";
                  } else if (isSelected && !answerState.correct) {
                    cls += "bg-red-500/10 border-red-500/60 text-red-300";
                  } else {
                    cls += "glass border-zinc-800/30 text-zinc-600 cursor-default";
                  }

                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={!answerState ? { x: 4 } : {}}
                      onClick={() => handleAnswer(opt.id)}
                      className={cls}
                      disabled={!!answerState || submitMutation.isPending}
                      data-testid={`option-${opt.id}`}
                    >
                      {opt.text}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Answer Feedback */}
          <AnimatePresence>
            {answerState && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`glass-strong rounded-lg p-6 mb-4 border ${
                  answerState.correct ? "border-green-500/40" : "border-red-500/40"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className={`font-mono text-sm font-bold tracking-widest ${answerState.correct ? "text-green-400" : "text-red-400"}`}>
                      {answerState.correct ? "CORRECT — INTEL CONFIRMED" : answerState.optionId === -1 ? "TIME EXPIRED" : "INCORRECT — REVIEW REQUIRED"}
                    </p>
                    {answerState.xpGained > 0 && (
                      <motion.p
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="font-mono text-xs text-green-400 mt-1"
                      >
                        +{answerState.xpGained} XP AWARDED
                      </motion.p>
                    )}
                  </div>
                </div>
                <p className="font-mono text-xs text-zinc-400 leading-relaxed">{answerState.explanation}</p>

                <button
                  onClick={nextQuestion}
                  className="mt-4 w-full py-3 font-mono text-xs tracking-widest text-blue-300 glass cipher-border rounded hover:bg-blue-500/10 transition-all"
                  data-testid="next-question-btn"
                >
                  {qIndex >= (questions?.length || 0) - 1 ? "VIEW DEBRIEF" : "NEXT QUESTION"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
