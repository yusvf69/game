import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";
import { getToken } from "@/lib/auth";
import { io, Socket } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_API_URL || "";

type BattleState = "idle" | "searching" | "battle" | "finished";
type QuestionData = { id: number; questionText: string; difficulty: number; category: string; options: { id: number; text: string }[]; timeLimit: number };

const BOOT_STEPS = [
  { text: "INITIALIZING ARENA PROTOCOL...", delay: 400, speed: 25 },
  { text: "ESTABLISHING SECURE LINK... OK", delay: 500, speed: 20 },
  { text: "LOADING MATCHMAKING QUEUE...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

export default function MultiplayerPage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("multiplayer");
  }, [setBooted]);

  useEffect(() => {
    if (booted["multiplayer"]) setBootDone(true);
  }, [booted]);

  const [battleState, setBattleState] = useState<BattleState>("idle");
  const [matchId, setMatchId] = useState<number | null>(null);
  const [opponent, setOpponent] = useState<{ userId: number; username: string } | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [scores, setScores] = useState<{ userId: number; username: string; score: number }[]>([]);
  const [answerState, setAnswerState] = useState<{ correct: boolean } | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [result, setResult] = useState<any>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    // Socket.IO not supported on Vercel serverless
    if (import.meta.env.PROD) return;
    const socket = io(BASE_URL, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", () => setSocketConnected(false));

    socket.on("battle:start", (data) => {
      setMatchId(data.matchId);
      setOpponent(data.opponent);
      setQuestions(data.questions);
      setQIndex(0);
      setScores([]);
      setAnswerState(null);
      setSelectedOption(null);
      setBattleState("battle");
    });

    socket.on("battle:scores", (data) => {
      setScores(data.scores);
    });

    socket.on("battle:next", (data) => {
      setQIndex(data.questionIndex);
      setAnswerState(null);
      setSelectedOption(null);
      setTimeLeft(questions[data.questionIndex]?.timeLimit || 30);
    });

    socket.on("battle:end", (data) => {
      setResult(data);
      setBattleState("finished");
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (battleState === "searching") {
      interval = setInterval(() => setSearchTime((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [battleState]);

  function handleSearch() {
    setBattleState("searching");
    setSearchTime(0);
    socketRef.current?.emit("matchmaking:join");
  }

  function handleCancel() {
    setBattleState("idle");
    socketRef.current?.emit("matchmaking:leave");
  }

  function handleAnswer(optionId: number) {
    if (answerState || !matchId) return;
    setSelectedOption(optionId);
    const question = questions[qIndex];
    if (!question) return;
    const timeMs = (question.timeLimit - timeLeft) * 1000;
    socketRef.current?.emit("battle:answer", { matchId, questionIndex: qIndex, optionId, timeMs });
    setAnswerState({ correct: true });
    setTimeout(() => {
      setAnswerState(null);
      setSelectedOption(null);
    }, 500);
  }

  function handlePlayAgain() {
    setBattleState("idle");
    setResult(null);
    setMatchId(null);
    setOpponent(null);
    setQuestions([]);
    setScores([]);
  }

  const question = questions[qIndex];

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="multiplayer" alreadyBooted={bootDone} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">
        <div className="relative max-w-3xl mx-auto px-4 py-8">

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">ARCHIVE ARENA</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">PvP BRAWL</h1>
          </motion.div>

          {battleState === "idle" && (
            <div className="glass-strong cipher-border rounded-lg p-10 text-center max-w-lg mx-auto">
              <div className="text-5xl mb-6">⚔</div>
              <p className="font-mono text-lg font-bold text-zinc-100 mb-2">Enter the Arena</p>
              <p className="font-mono text-xs text-zinc-500 mb-8">Face another agent in real-time intelligence combat. First to crack the code wins.</p>
              {!socketConnected && (
                <p className="font-mono text-xs text-zinc-600 mb-4">REAL-TIME ARENA UNAVAILABLE — STAGE MODE ONLY</p>
              )}
              <button onClick={handleSearch} disabled={!socketConnected}
                className={`w-full py-4 font-mono text-sm tracking-widest rounded-lg transition-all ${socketConnected ? "text-blue-300 glass cipher-border hover:bg-blue-500/10 neon-blue" : "text-zinc-700 bg-zinc-900 border border-zinc-800 cursor-not-allowed"}`}
                data-testid="find-match-btn">
                {socketConnected ? "FIND OPPONENT" : "NOT AVAILABLE"}
              </button>
            </div>
          )}

          {battleState === "searching" && (
            <div className="glass-strong cipher-border rounded-lg p-10 text-center max-w-lg mx-auto">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-5xl mb-6">
                🔍
              </motion.div>
              <p className="font-mono text-lg font-bold text-blue-400 mb-2">SEARCHING FOR AGENT...</p>
              <p className="font-mono text-xs text-zinc-500 mb-6">Scanning intelligence network for suitable opponent</p>
              <div className="flex items-center justify-center gap-2 mb-6">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }} className="w-2 h-2 rounded-full bg-blue-400" />
                ))}
              </div>
              <p className="font-mono text-xs text-zinc-600 mb-4">ELAPSED: {searchTime}s</p>
              <button onClick={handleCancel} className="font-mono text-xs text-zinc-600 hover:text-red-400 transition-colors">
                CANCEL SEARCH
              </button>
            </div>
          )}

          {battleState === "battle" && question && (
            <div>
              <div className="flex items-center justify-between glass cipher-border rounded-lg px-5 py-3 mb-6">
                <div className="text-left">
                  <p className="font-mono text-xs text-zinc-500">YOU</p>
                  <p className="font-mono text-lg font-bold text-blue-400">{scores.length > 0 ? scores[scores.length - 1].score : 0}</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-xs text-zinc-600 tracking-widest">VS</p>
                  <p className="font-mono text-xs text-zinc-500">Q{qIndex + 1}/{questions.length}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-zinc-500">{opponent?.username || "???"}</p>
                  <p className="font-mono text-lg font-bold text-red-400">{scores.length > 0 ? scores[0].score : 0}</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={qIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
                  className="glass-strong cipher-border rounded-lg p-8 mb-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-mono text-xs text-zinc-600 tracking-widest border border-zinc-700/50 px-2 py-1 rounded">
                      {question.category?.toUpperCase() || "INTEL"}
                    </span>
                    <span className="font-mono text-xs text-zinc-700">DIFFICULTY {question.difficulty}/10</span>
                  </div>
                  <p className="font-mono text-base text-zinc-100 leading-relaxed mb-6">{question.questionText}</p>

                  <div className="space-y-3">
                    {question.options.map((opt) => {
                      let cls = "w-full text-left px-5 py-4 rounded-lg font-mono text-sm transition-all duration-200 border ";
                      if (!answerState) {
                        cls += "glass border-zinc-700/50 hover:border-blue-500/50 hover:bg-blue-500/5 text-zinc-200 cursor-pointer";
                      } else {
                        cls += "glass border-zinc-800/30 text-zinc-600";
                      }
                      return (
                        <motion.button key={opt.id} whileHover={!answerState ? { x: 4 } : {}}
                          onClick={() => handleAnswer(opt.id)} className={cls} disabled={!!answerState}
                        >
                          {opt.text}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="glass rounded-lg p-4">
                <p className="font-mono text-xs text-zinc-600 text-center tracking-widest">LIVE SCORES UPDATING IN REAL-TIME</p>
              </div>
            </div>
          )}

          {battleState === "finished" && result && (
            <div className="glass-strong cipher-border rounded-lg p-10 text-center max-w-lg mx-auto">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                <div className="text-6xl mb-4">{result.isWinner ? "🏆" : "💔"}</div>
              </motion.div>
              <p className={`font-mono text-2xl font-bold mb-2 ${result.isWinner ? "text-green-400" : "text-red-400"}`}>
                {result.isWinner ? "VICTORY" : "DEFEATED"}
              </p>
              <p className="font-mono text-xs text-zinc-500 mb-6">
                {result.isWinner ? "The Archive celebrates your triumph" : "Learn from this loss and return stronger"}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="glass rounded-lg p-4">
                  <p className="font-mono text-xs text-zinc-600 mb-1">YOUR SCORE</p>
                  <p className="font-mono text-2xl font-bold text-blue-400">{result.score}</p>
                </div>
                <div className="glass rounded-lg p-4">
                  <p className="font-mono text-xs text-zinc-600 mb-1">OPPONENT</p>
                  <p className="font-mono text-2xl font-bold text-red-400">{result.opponentScore || 0}</p>
                </div>
                <div className="glass rounded-lg p-4">
                  <p className="font-mono text-xs text-zinc-600 mb-1">XP GAINED</p>
                  <p className="font-mono text-lg font-bold text-green-400">+{result.xpGained}</p>
                </div>
                <div className="glass rounded-lg p-4">
                  <p className="font-mono text-xs text-zinc-600 mb-1">RANK CHANGE</p>
                  <p className={`font-mono text-lg font-bold ${result.rankChange > 0 ? "text-green-400" : "text-red-400"}`}>
                    {result.rankChange > 0 ? "+" : ""}{result.rankChange}
                  </p>
                </div>
              </div>
              <div className="font-mono text-xs text-zinc-600 mb-6">{result.correctAnswers}/{result.totalQuestions} CORRECT</div>
              <button onClick={handlePlayAgain} className="w-full py-4 font-mono text-sm tracking-widest text-blue-300 glass cipher-border rounded-lg hover:bg-blue-500/10 transition-all neon-blue">
                BATTLE AGAIN
              </button>
            </div>
          )}

        </div>
      </div>
    </AOSLayout>
    </>
  );
}
