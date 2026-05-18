import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AOSLayout from "@/components/aos/AOSLayout";
import { initAudio, playMatchStart, playTick, playMatchEnd } from "@/lib/audio";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface StageTeam {
  id: number; name: string; color: string;
  score: number; correct: number; total: number; streak: number;
}

interface StageQuestion {
  id: number; questionText: string;
  options: { id: number; text: string }[];
  timeLimit: number; category: string; difficulty: number;
}

export default function StagePage() {
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [matchId, setMatchId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("matchId");
    return m ? parseInt(m) : null;
  });
  const [phase, setPhase] = useState<string>("idle");
  const [teams, setTeams] = useState<StageTeam[]>([]);
  const [question, setQuestion] = useState<StageQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [timerTotal, setTimerTotal] = useState(30);
  const [buzzerTeam, setBuzzerTeam] = useState<{ id: number; name: string } | null>(null);
  const [winner, setWinner] = useState<StageTeam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => { initAudio(); }, []);

  const prevPhase = useRef<string>("idle");
  const prevTickSecond = useRef<number>(-1);

  useEffect(() => {
    if (phase === "intro" && prevPhase.current === "idle") {
      playMatchStart();
    }
    if (phase === "ended" && prevPhase.current !== "ended") {
      const sorted = [...teams].sort((a, b) => b.score - a.score);
      const winner = sorted[0];
      playMatchEnd(!!winner);
    }
    if (timerActive && timerSeconds > 0 && timerSeconds <= 5) {
      const intSec = Math.ceil(timerSeconds);
      if (intSec >= 1 && intSec !== prevTickSecond.current) {
        playTick();
        prevTickSecond.current = intSec;
      }
    } else {
      prevTickSecond.current = -1;
    }
    prevPhase.current = phase;
  }, [phase, timerSeconds, timerActive, teams]);

  // Poll stage state
  useEffect(() => {
    if (!matchId) return;
    const poll = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/stage/${matchId}`);
        if (!res.ok) throw new Error("Not found");
        setConnected(true);
        const d = await res.json();
        setPhase(d.phase);
        setQuestionIndex(d.currentQuestionIndex);
        setTotalQuestions(d.totalQuestions);
        setQuestion(d.question);
        setWrongAttempts(d.wrongAttempts || 0);

        if (d.teams) setTeams(d.teams);
        if (d.buzzerTeamId) {
          const bt = d.teams?.find((t: StageTeam) => t.id === d.buzzerTeamId);
          setBuzzerTeam(bt ? { id: bt.id, name: bt.name } : null);
        } else {
          setBuzzerTeam(null);
        }

        if (d.timerStartedAt && d.timerSeconds > 0) {
          const elapsed = (Date.now() - d.timerStartedAt) / 1000;
          const remaining = Math.max(0, d.timerSeconds - elapsed);
          setTimerSeconds(remaining);
          setTimerTotal(d.timerSeconds);
          setTimerActive(d.phase === "question" || d.phase === "rebuzz");
        } else {
          setTimerActive(false);
        }

        if (d.phase === "ended") {
          const sorted = [...(d.teams || [])].sort((a: StageTeam, b: StageTeam) => b.score - a.score);
          setWinner(sorted[0] || null);
        }
      } catch { setConnected(false); }
    };
    poll();
    pollingRef.current = setInterval(poll, 1500);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); } };
  }, [matchId]);

  // Timer timeout detection
  const timeoutRef = useRef(false);
  useEffect(() => {
    if (!timerActive || timerSeconds > 0) { timeoutRef.current = false; return; }
    if (timeoutRef.current) return;
    timeoutRef.current = true;
    if (matchId) {
      fetch(`${BASE_URL}/api/stage/timeout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      }).catch(() => {});
    }
  }, [timerSeconds, timerActive, matchId]);

  const handleConnect = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val) && val > 0) {
      const url = new URL(window.location.href);
      url.searchParams.set("matchId", String(val));
      window.history.replaceState({}, "", url.toString());
      setMatchId(val);
    }
  };

  if (!matchId) {
    return (
      <AOSLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-strong cipher-border rounded-lg p-8 max-w-sm w-full text-center">
            <div className="font-mono text-4xl mb-4 text-blue-400 neon-text-blue">🎬</div>
            <h1 className="font-mono text-xl font-black text-zinc-100 mb-2">STAGE <span className="text-blue-400 neon-text-blue">MODE</span></h1>
            <p className="font-mono text-[10px] text-zinc-600 tracking-widest mb-6">ENTER MATCH ID TO DISPLAY</p>
            <input value={inputValue} onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConnect()}
              placeholder="1778910326622" inputMode="numeric"
              className="w-full bg-black/40 border border-zinc-700/60 rounded px-4 py-3 font-mono text-sm text-zinc-200 placeholder-zinc-700 text-center focus:border-blue-500/60 focus:outline-none mb-4" />
            <button onClick={handleConnect} disabled={!inputValue}
              className="w-full py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg disabled:opacity-30">
              CONNECT TO STAGE
            </button>
          </motion.div>
        </div>
      </AOSLayout>
    );
  }

  return (
    <AOSLayout showPacketRain={phase === "question" || phase === "buzzed"}>
      <div className="min-h-screen text-white overflow-hidden relative">
        <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] z-50 opacity-10" />

        <div className="absolute top-0 left-0 right-0 z-40 p-6 flex items-center justify-between">
          <div>
            <span className="font-mono text-xs tracking-widest text-zinc-600">STAGE <span className="text-blue-400">MODE</span></span>
            {(phase === "question" || phase === "buzzed" || phase === "answered") && (
              <span className="ml-4 font-mono text-[10px] text-zinc-800">Q{questionIndex + 1}/{totalQuestions}</span>
            )}
          </div>
          <div className="flex items-center gap-6">
            {teams.map(t => (
              <div key={t.id} className="text-right" style={{ color: t.color }}>
                <div className="font-mono text-xl font-black">{t.score}</div>
                <div className="font-mono text-[9px] opacity-60 tracking-widest">{t.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="font-mono text-[8px] text-zinc-800 tracking-widest">{connected ? "LIVE" : "OFFLINE"}</span>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8 md:p-16">
          {phase === "idle" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="font-mono text-6xl md:text-8xl font-black tracking-widest text-zinc-900 mb-4">STANDBY</div>
              <div className="font-mono text-sm text-zinc-700 tracking-widest mb-8">WAITING FOR HOST</div>
              <div className="space-y-2">
                {teams.map(t => (
                  <div key={t.id} className="font-mono text-sm" style={{ color: t.color }}>{t.name || `TEAM ${t.id}`}</div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "intro" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="font-mono text-2xl text-blue-400 tracking-widest neon-text-blue">
                INITIALIZING OPERATION...
              </motion.div>
            </motion.div>
          )}

          {(phase === "question" || phase === "buzzed") && question && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl text-center">
              <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-4">
                QUESTION {questionIndex + 1}
                <span className="text-zinc-800 mx-2">//</span>
                <span className="text-blue-400">{question.category?.toUpperCase()}</span>
                <span className="text-zinc-800 mx-2">DIFF {question.difficulty}</span>
                {wrongAttempts > 0 && <span className="text-yellow-400 mx-2">◈ SECOND CHANCE ◈</span>}
              </div>
              <div className="font-mono text-2xl md:text-4xl lg:text-5xl font-bold text-zinc-100 leading-relaxed mb-8 max-w-4xl mx-auto">
                {question.questionText}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto mb-6">
                {question.options.map((opt, i) => (
                  <div key={opt.id} className="glass-strong border border-zinc-800/60 rounded-lg px-6 py-4 font-mono text-lg text-zinc-300">
                    <span className="text-zinc-600 mr-3">{String.fromCharCode(65 + i)}.</span>
                    {opt.text}
                  </div>
                ))}
              </div>
              {timerActive && (
                <div className="max-w-md mx-auto mb-6">
                  <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <motion.div animate={{ width: `${(timerSeconds / Math.max(1, timerTotal)) * 100}%` }}
                      className={`h-full rounded-full transition-colors ${wrongAttempts > 0 ? "bg-yellow-500" : timerSeconds > 10 ? "bg-blue-500" : timerSeconds > 5 ? "bg-yellow-500" : "bg-red-500"}`} />
                  </div>
                  <div className="font-mono text-[10px] text-zinc-700 mt-1 tracking-widest">{timerSeconds.toFixed(1)}s</div>
                </div>
              )}
              <AnimatePresence>
                {buzzerTeam && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="inline-block">
                    <motion.div animate={{ boxShadow: ["0 0 20px rgba(239,68,68,0.3)", "0 0 80px rgba(239,68,68,0.8)", "0 0 20px rgba(239,68,68,0.3)"] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="bg-red-600/20 border-2 border-red-500 rounded-xl px-8 py-4">
                      <div className="font-mono text-xs text-red-400 tracking-widest mb-1">
                        {wrongAttempts > 0 ? "SECOND RESPONSE" : "FIRST RESPONSE"}
                      </div>
                      <div className="font-mono text-3xl font-black text-white">{buzzerTeam.name}</div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {phase === "answered" && !winner && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="font-mono text-4xl md:text-6xl font-black text-zinc-900 tracking-widest mb-4">
                {buzzerTeam ? "RESPONSE RECORDED" : "TIME EXPIRED"}
              </div>
              <div className="font-mono text-sm text-zinc-700 tracking-widest">AWAITING HOST...</div>
            </motion.div>
          )}

          {phase === "ended" && winner && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-4">MISSION COMPLETE</div>
              <motion.div animate={{ textShadow: ["0 0 20px rgba(234,179,8,0.3)", "0 0 60px rgba(234,179,8,0.8)", "0 0 20px rgba(234,179,8,0.3)"] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="font-mono text-6xl md:text-8xl font-black tracking-widest mb-4" style={{ color: winner.color }}>
                {winner.name}
              </motion.div>
              <div className="font-mono text-2xl text-zinc-600 mb-8">VICTORIOUS</div>
              <div className="max-w-md mx-auto space-y-2">
                {[...teams].sort((a, b) => b.score - a.score).map((t, i) => (
                  <div key={t.id} className="flex items-center justify-between glass-strong rounded-lg px-6 py-3"
                    style={{ borderColor: `${t.color}40`, borderWidth: 1 }}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-zinc-700">#{i + 1}</span>
                      <span className="font-mono text-sm" style={{ color: t.color }}>{t.name}</span>
                    </div>
                    <div className="font-mono text-lg font-black" style={{ color: t.color }}>{t.score}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {teams.length > 0 && phase !== "ended" && phase !== "idle" && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm border-t border-zinc-900">
            <div className="flex justify-center gap-8 p-4">
              {teams.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3" style={{ color: t.color }}>
                  <div className="font-mono text-[10px] text-zinc-700">#{i + 1}</div>
                  <div className="font-mono text-sm font-bold">{t.name}</div>
                  <div className="font-mono text-xl font-black">{t.score}</div>
                  <div className="font-mono text-[10px] opacity-40">{t.correct}/{t.total}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="absolute bottom-8 left-0 right-0 text-center font-mono text-xs text-red-400">{error}</div>}
      </div>
    </AOSLayout>
  );
}
