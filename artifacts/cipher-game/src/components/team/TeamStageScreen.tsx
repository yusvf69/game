import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TeamScoreboard from "./TeamScoreboard";

interface StageQuestion {
  id: number;
  questionText: string;
  difficulty: number;
  category: string;
  options: { id: number; text: string }[];
  timeLimit: number;
  type: string;
}

interface TeamStageScreenProps {
  matchId: number;
  roomCode: string;
  questions: StageQuestion[];
  scores: any[];
  currentQ: number;
  buzzerTeam: number | null;
  onNextQuestion: () => void;
  onMarkAnswer: (teamId: number, correct: boolean) => void;
  isHost: boolean;
}

const DOMAIN_NAMES: Record<string, string> = {
  cryptography: "CIPHER DIVISION",
  history: "HISTORICAL ARCHIVES",
  science: "SCIENTIFIC DIVISION",
  logic: "COGNITIVE ANALYSIS",
  technology: "CYBER SYSTEMS",
  general: "GENERAL INTEL",
};

export default function TeamStageScreen({
  matchId, roomCode, questions, scores, currentQ, buzzerTeam,
  onNextQuestion, onMarkAnswer, isHost,
}: TeamStageScreenProps) {
  const [showCategory, setShowCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [phase, setPhase] = useState<"category" | "question" | "answer" | "finished">("category");

  const question = questions[currentQ];
  const domain = DOMAIN_NAMES[question?.category as string] || question?.category?.toUpperCase() || "INTEL DIVISION";

  // Category reveal on new question
  useEffect(() => {
    if (!question) return;
    setPhase("category");
    setShowCategory(true);
    setCategoryName(domain);
    setCountdown(3);
    const c = setInterval(() => {
      setCountdown((p) => {
        if (p <= 1) {
          clearInterval(c);
          setShowCategory(false);
          setPhase("question");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(c);
  }, [currentQ, question?.id]);

  if (!question) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-4xl font-black text-blue-400 neon-text-blue mb-4">STAGE MODE</div>
          <div className="font-mono text-xs text-zinc-600">Waiting for questions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="glass border-b border-zinc-800/60 p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-zinc-700 tracking-widest">
            STAGE MODE
          </span>
          <span className="font-mono text-xs text-blue-400 font-bold">{roomCode}</span>
          <span className="font-mono text-[10px] text-zinc-700">
            Q {currentQ + 1}/{questions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {buzzerTeam && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="font-mono text-xs text-red-400 font-bold"
            >
              BUZZ: TEAM #{buzzerTeam}
            </motion.span>
          )}
          {isHost && phase === "answer" && (
            <button onClick={onNextQuestion}
              className="font-mono text-xs tracking-widest text-blue-300 glass border border-blue-500/30 px-4 py-2 rounded hover:bg-blue-500/10">
              NEXT QUESTION
            </button>
          )}
          {isHost && phase === "question" && (
            <button onClick={() => setPhase("answer")}
              className="font-mono text-xs tracking-widest text-amber-300 glass border border-amber-500/30 px-4 py-2 rounded hover:bg-amber-500/10">
              REVEAL ANSWER
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Question */}
        <div className="flex-1 p-6 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {phase === "category" ? (
              <motion.div
                key="category"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center"
              >
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-6xl mb-6"
                >
                  {question.category === "cryptography" ? "🔐" :
                   question.category === "history" ? "📜" :
                   question.category === "science" ? "🔬" :
                   question.category === "logic" ? "🧠" :
                   question.category === "technology" ? "⚡" : "📡"}
                </motion.div>
                <h1 className="font-mono text-4xl font-black text-zinc-100 mb-2">{categoryName}</h1>
                <div className="flex items-center justify-center gap-2 mt-8">
                  {[3, 2, 1].map((n) => (
                    <motion.div
                      key={n}
                      className="w-16 h-16 rounded-lg border-2 border-blue-500/40 flex items-center justify-center font-mono text-3xl font-black text-blue-400"
                      animate={countdown === n ? { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      {n > countdown ? "•" : n}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : phase === "question" || phase === "answer" ? (
              <motion.div
                key="question"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="max-w-2xl mx-auto w-full"
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-mono text-[10px] text-zinc-600 tracking-widest border border-zinc-700/50 px-2 py-1 rounded">
                    {question.category?.toUpperCase() || "INTEL"}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-700">DIFFICULTY {question.difficulty}/10</span>
                </div>

                <p className="font-mono text-xl text-zinc-100 leading-relaxed mb-8">
                  {question.questionText}
                </p>

                {phase === "answer" && (
                  <div className="space-y-2">
                    {question.options.map((opt, i) => (
                      <motion.div
                        key={opt.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="font-mono text-sm text-zinc-400 border border-zinc-800/50 rounded p-3"
                      >
                        {String.fromCharCode(65 + i)}. {opt.text}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Right: Scoreboard */}
        <div className="w-full lg:w-80 p-4 border-t lg:border-t-0 lg:border-l border-zinc-800/40 overflow-y-auto max-h-screen">
          <TeamScoreboard scores={scores} maxDisplay={8} />

          {phase === "answer" && isHost && buzzerTeam && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-2"
            >
              <p className="font-mono text-[10px] text-zinc-600 tracking-widest">MARK ANSWER</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onMarkAnswer(buzzerTeam, true)}
                  className="flex-1 py-3 font-mono text-xs tracking-widest text-green-400 glass border border-green-500/40 rounded hover:bg-green-500/10"
                >
                  ✓ CORRECT
                </button>
                <button
                  onClick={() => onMarkAnswer(buzzerTeam, false)}
                  className="flex-1 py-3 font-mono text-xs tracking-widest text-red-400 glass border border-red-500/40 rounded hover:bg-red-500/10"
                >
                  ✗ WRONG
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
