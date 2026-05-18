import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AOSLayout from "@/components/aos/AOSLayout";
import { initAudio, playBuzzer } from "@/lib/audio";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const MODULE_INFO: Record<string, { icon: string; label: string; desc: string; color: string }> = {
  signal_trace: { icon: "📡", label: "SIGNAL TRACE", desc: "Eliminate 2 options", color: "#3b82f6" },
  time_dilation: { icon: "⏳", label: "TIME DILATION", desc: "+10 seconds", color: "#22c55e" },
  archive_scan: { icon: "📖", label: "ARCHIVE SCAN", desc: "Reveal hint", color: "#06b6d4" },
  ghost_protocol: { icon: "👻", label: "GHOST PROTOCOL", desc: "Preserve streak", color: "#a855f7" },
  neural_boost: { icon: "🧬", label: "NEURAL BOOST", desc: "Focus mode", color: "#ec4899" },
  threat_prediction: { icon: "🎯", label: "THREAT PREDICTION", desc: "Analyze options", color: "#f59e0b" },
  memory_recall: { icon: "💾", label: "MEMORY RECALL", desc: "Recall context", color: "#8b5cf6" },
  overclock: { icon: "⚠️", label: "OVERCLOCK", desc: "Double speed bonus", color: "#ef4444" },
};

const EMBLEM_MAP: Record<string, string> = {
  default: "🔰", crown: "👑", skull: "💀", phoenix: "🔥", wolf: "🐺",
  eagle: "🦅", dragon: "🐉", cyber: "⚡", raven: "🐦‍⬛", ghost: "👻", cipher: "🔐", strike: "⚔️",
};

export default function BuzzerPage() {
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connected, setConnected] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamColor, setTeamColor] = useState("#ef4444");
  const [teamEmblem, setTeamEmblem] = useState("");
  const [matchId, setMatchId] = useState<number | null>(null);
  const [tacticalLoadout, setTacticalLoadout] = useState<string[]>([]);
  const [buzzed, setBuzzed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; points: number } | null>(null);
  const [finalScores, setFinalScores] = useState<{ id: number; name: string; color: string; score: number; correct: number; total: number }[]>([]);

  useEffect(() => { initAudio(); }, []);

  // Poll for match state
  useEffect(() => {
    if (!matchId || !teamId) return;
    const poll = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/stage/${matchId}`);
        if (!res.ok) return;
        const d = await res.json();
        setPhase(d.phase);

        if (d.phase === "question" || d.phase === "rebuzz") {
          setLocked(false);
        }
        if (d.phase === "buzzed" && d.buzzerTeamId === teamId) {
          setBuzzed(true);
          setLocked(true);
        }
        if (d.phase === "buzzed" && d.buzzerTeamId !== teamId) {
          setLocked(true);
        }
        if (d.phase === "answered") {
          setBuzzed(false);
        }
        if (d.phase === "ended") {
          setLocked(true);
          setPhase("ended");
          if (d.teams) {
            setFinalScores(d.teams.map((t: any) => ({ id: t.id, name: t.name, color: t.color, score: t.score, correct: t.correct, total: t.total })));
          }
        }
      } catch {}
    };
    poll();
    pollingRef.current = setInterval(poll, 1200);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [matchId, teamId]);

  const connectToMatch = useCallback(async () => {
    if (!teamCode || teamCode.length !== 4) return;
    setConnecting(true); setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/stage/buzzer-connect`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode: teamCode.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setMatchId(data.matchId);
      setTeamId(data.teamId);
      setTeamName(data.teamName);
      setTeamColor(data.teamColor);
      setTeamEmblem(data.teamEmblem);
      setTacticalLoadout(data.tacticalLoadout || []);
      setConnected(true);
    } catch (e: any) { setError(e.message); }
    setConnecting(false);
  }, [teamCode]);

  const handleBuzz = useCallback(async () => {
    if (locked || buzzed || !matchId || !teamId) return;
    setBuzzed(true); setLocked(true);
    playBuzzer();
    try {
      const res = await fetch(`${BASE_URL}/api/stage/buzz`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, teamId }),
      });
      const d = await res.json();
      // Poll will update state based on answer-result
      if (d.reason === "already_buzzed") {
        setBuzzed(false);
        setLocked(true);
      }
    } catch {}
  }, [locked, buzzed, matchId, teamId]);

  if (!connected) {
    return (
      <AOSLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-strong cipher-border rounded-lg p-8 max-w-sm w-full text-center">
            <div className="font-mono text-4xl mb-4 text-red-400">🔴</div>
            <h1 className="font-mono text-xl font-black text-zinc-100 mb-2">BUZZER <span className="text-red-400">TERMINAL</span></h1>
            <p className="font-mono text-[10px] text-zinc-600 tracking-widest mb-6">ENTER YOUR TEAM CODE</p>
            <div>
              <label className="font-mono text-[10px] text-zinc-600 tracking-widest mb-1 block text-left">TEAM CODE</label>
              <input value={teamCode} onChange={e => setTeamCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="XK9M" maxLength={4}
                className="w-full bg-black/40 border border-zinc-700/60 rounded px-4 py-3 font-mono text-2xl text-zinc-200 placeholder-zinc-700 text-center tracking-[0.4em] focus:border-blue-500/60 focus:outline-none uppercase" />
            </div>
            {error && <div className="mt-3 font-mono text-[10px] text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</div>}
            <button onClick={connectToMatch} disabled={teamCode.length !== 4 || connecting}
              className="w-full mt-6 py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg disabled:opacity-30 transition-all">
              {connecting ? <span className="animate-pulse">CONNECTING...</span> : "◈ CONNECT ◈"}
            </button>
          </motion.div>
        </div>
      </AOSLayout>
    );
  }

  return (
    <AOSLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        {phase === "ended" && finalScores.length > 0 ? (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full max-w-md">
            <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-4">OPERATION COMPLETE</div>
            <div className="font-mono text-3xl font-black text-zinc-100 mb-6">MISSION <span className="text-yellow-400">COMPLETE</span></div>

            {(() => {
              const sorted = [...finalScores].sort((a, b) => b.score - a.score);
              const winner = sorted[0];
              const myRank = sorted.findIndex(t => t.id === teamId) + 1;
              const isWinner = winner.id === teamId;
              return (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
                    className="inline-block glass-strong border-2 border-yellow-500/50 rounded-2xl px-8 py-5 mb-6">
                    <div className="font-mono text-3xl mb-1">👑</div>
                    <div className="font-mono text-[10px] text-yellow-400 tracking-widest mb-1">WINNER</div>
                    <div className="font-mono text-2xl font-black" style={{ color: winner.color }}>{winner.name}</div>
                    <div className="font-mono text-4xl font-black text-yellow-400 mt-1">{winner.score}</div>
                    <div className="font-mono text-[10px] text-zinc-600 mt-1">{winner.correct}/{winner.total} CORRECT</div>
                  </motion.div>

                  {isWinner && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                      className="font-mono text-sm text-green-400 border border-green-500/30 bg-green-500/10 rounded-lg px-4 py-2 mb-6">YOU ARE THE WINNER</motion.div>
                  )}

                  <div className="space-y-1.5 mb-6">
                    {sorted.map((t, i) => {
                      const isMe = t.id === teamId;
                      return (
                        <motion.div key={t.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                          className={`glass rounded-lg px-4 py-2.5 flex items-center justify-between border ${isMe ? "border-blue-500/40 bg-blue-500/5" : "border-zinc-800"}`}>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-400" : i === 2 ? "text-amber-700" : "text-zinc-700"}`}>
                              #{i + 1}
                            </span>
                            <span className="font-mono text-sm font-bold" style={{ color: isMe ? "#60a5fa" : t.color }}>
                              {t.name}{isMe ? " (YOU)" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-zinc-600">{t.correct}/{t.total}</span>
                            <span className="font-mono text-base font-black" style={{ color: t.color }}>{t.score}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                    className="font-mono text-[10px] text-zinc-700">
                    YOUR RANK: <span className={`${myRank === 1 ? "text-yellow-400" : "text-zinc-400"} tracking-wider`}>#{myRank}</span>
                  </motion.div>
                </>
              );
            })()}
          </motion.div>
        ) : (
          <div className="text-center max-w-sm w-full">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="font-mono text-2xl mb-1">{EMBLEM_MAP[teamEmblem] || "◈"}</div>
              <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-1">CONNECTED AS</div>
              <div className="font-mono text-lg font-bold" style={{ color: teamColor }}>{teamName}</div>
              <div className="font-mono text-[10px] text-zinc-700">CODE: <span className="text-yellow-400 tracking-wider">{teamCode}</span></div>
            </motion.div>

            <motion.button onClick={handleBuzz} disabled={locked}
              whileTap={!locked ? { scale: 0.9 } : {}}
              animate={locked ? {} : { boxShadow: ["0 0 20px rgba(239,68,68,0.3)", "0 0 60px rgba(239,68,68,0.6)", "0 0 20px rgba(239,68,68,0.3)"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`w-48 h-48 rounded-full font-mono text-2xl font-black tracking-widest transition-all ${
                locked ? "bg-zinc-900 text-zinc-700 cursor-not-allowed border-4 border-zinc-800"
                  : buzzed ? "bg-red-600 text-white border-4 border-red-400 cursor-pointer"
                    : "bg-red-900/30 text-red-400 border-4 border-red-500/50 cursor-pointer hover:bg-red-800/30"
              }`}>
              <AnimatePresence mode="wait">
                {locked ? (
                  <motion.span key="locked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="block text-sm">LOCKED</motion.span>
                ) : buzzed ? (
                  <motion.span key="buzzed" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="block">BUZZED!</motion.span>
                ) : (
                  <motion.span key="buzz" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="block">◈ BUZZ ◈</motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
              className="mt-6 font-mono text-[10px] text-zinc-700 tracking-widest">
              {phase === "ended" ? "OPERATION COMPLETE"
                : locked && buzzed ? "◈ AWAITING VERDICT ◈"
                  : locked ? "◈ ANOTHER TEAM IS ANSWERING ◈"
                    : phase === "question" || phase === "rebuzz" ? "◈ QUESTION LIVE ◈"
                      : "◈ STANDBY ◈"}
            </motion.div>

            {tacticalLoadout.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-3">TACTICAL LOADOUT</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {tacticalLoadout.map(modId => {
                    const mod = MODULE_INFO[modId];
                    if (!mod) return null;
                    return (
                      <div key={modId} className="px-3 py-2 font-mono text-[10px] tracking-wider rounded-lg border"
                        style={{ backgroundColor: `${mod.color}15`, borderColor: `${mod.color}40`, color: mod.color }}>
                        <div>{mod.icon} {mod.label}</div>
                        <div className="text-[8px] opacity-50 mt-0.5">{mod.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </AOSLayout>
  );
}
