import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/auth";
import AOSLayout from "@/components/aos/AOSLayout";
import { NavBar } from "@/components/NavBar";
import { initAudio, playMatchStart, playCorrect, playWrong, playMatchEnd, playTick } from "@/lib/audio";
import { convertToBlobUrl } from "@/lib/utils";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const DOMAIN_ICONS: Record<string, string> = {
  cyber_systems: "⚡", cognitive_analysis: "🧠", historical_archives: "📜",
  threat_intelligence: "🛡️", scientific_division: "🔬", behavioral_analysis: "🎭",
  global_mapping: "🌍", cipher_division: "🔐", general: "📁",
};

const DIFFICULTIES = [
  { id: "recruit", label: "RECRUIT", color: "text-green-400", mult: "×0.5" },
  { id: "agent", label: "AGENT", color: "text-blue-400", mult: "×1.0" },
  { id: "elite", label: "ELITE", color: "text-purple-400", mult: "×1.8" },
  { id: "omega", label: "OMEGA", color: "text-red-400", mult: "×3.0" },
];

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

const TEAM_NAMES = ["NIGHT CROWS", "VOID PROTOCOL", "BLACK VEIL", "PHANTOM UNIT", "CYBER HIVE", "SHADOW CORE", "IRON WOLF", "GHOST CELL"];

const MODULE_OPTIONS = [
  { id: "signal_trace", icon: "📡", name: "Signal Trace", desc: "Eliminate 2 options" },
  { id: "time_dilation", icon: "⏳", name: "Time Dilation", desc: "+10 seconds" },
  { id: "archive_scan", icon: "📖", name: "Archive Scan", desc: "Reveal hint" },
  { id: "ghost_protocol", icon: "👻", name: "Ghost Protocol", desc: "Preserve streak" },
  { id: "neural_boost", icon: "🧬", name: "Neural Boost", desc: "Focus mode" },
  { id: "threat_prediction", icon: "🎯", name: "Threat Prediction", desc: "Analyze options" },
  { id: "memory_recall", icon: "💾", name: "Memory Recall", desc: "Recall context" },
  { id: "overclock", icon: "⚠️", name: "Overclock", desc: "Double speed bonus" },
];

interface TeamSetup {
  id: number; name: string; color: string; emblem: string; tacticalLoadout: string[];
}

interface ScoreEntry {
  id: number; name: string; color: string; score: number; correct: number; total: number;
}

export default function HostControl() {
  const token = getToken();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [step, setStep] = useState<"create" | "config" | "loadout" | "lobby" | "stage" | "ended">("create");

  const [domainsList, setDomainsList] = useState<{ id: string; label: string; categories: string[] }[]>([]);
  const [teamCount, setTeamCount] = useState(3);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [shuffle, setShuffle] = useState(true);
  const [difficulty, setDifficulty] = useState("agent");
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [questionCount, setQuestionCount] = useState(10);

  const [matchId, setMatchId] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [teams, setTeams] = useState<TeamSetup[]>([]);
  const [teamCodes, setTeamCodes] = useState<string[]>([]);

  const [phase, setPhase] = useState<string>("lobby");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [question, setQuestion] = useState<any>(null);
  const [timerValue, setTimerValue] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [buzzerTeamId, setBuzzerTeamId] = useState<number | null>(null);
  const [buzzerTeamName, setBuzzerTeamName] = useState("");
  const [buzzerPlayerName, setBuzzerPlayerName] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; teamName: string; points: number; pointsLost?: number; newScore?: number; rebuzz?: boolean; mode?: string } | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [rebuzzOpen, setRebuzzOpen] = useState(false);
  const [rebuzzExcludedTeam, setRebuzzExcludedTeam] = useState("");
  const [connectedTeamIds, setConnectedTeamIds] = useState<number[]>([]);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => { initAudio(); }, []);

  // Load domains/categories from admin-managed categories table
  useEffect(() => {
    fetch(`${BASE_URL}/api/stage/categories`).then(r => r.json()).then(d => {
      if (d.domains && d.domains.length > 0) {
        setDomainsList(d.domains);
        setSelectedDomains([d.domains[0].id]);
      }
    }).catch(() => {});
  }, []);

  const prevHostPhase = useRef<string>("lobby");
  const prevHostTick = useRef<number>(-1);
  const prevQIndex = useRef<number>(-1);

  useEffect(() => {
    if (phase === "intro" && prevHostPhase.current === "idle") {
      playMatchStart();
    }
    if (step === "ended" && prevHostPhase.current !== "ended") {
      playMatchEnd(true);
    }
    prevHostPhase.current = step === "ended" ? "ended" : phase;
  }, [phase, step]);

  useEffect(() => {
    if (!answerResult || answerResult.rebuzz) return;
    if (answerResult.correct) playCorrect();
    else playWrong();
  }, [answerResult]);

  useEffect(() => {
    const mu = question?.mediaUrl;
    if (!mu) { setMediaBlobUrl(null); return; }
    convertToBlobUrl(mu).then(setMediaBlobUrl);
    return () => { if (mediaBlobUrl?.startsWith("blob:")) URL.revokeObjectURL(mediaBlobUrl); };
  }, [question?.mediaUrl]);

  useEffect(() => {
    if (timerActive && timerValue > 0 && timerValue <= 5) {
      const intSec = Math.ceil(timerValue);
      if (intSec >= 1 && intSec !== prevHostTick.current) {
        playTick();
        prevHostTick.current = intSec;
      }
    } else {
      prevHostTick.current = -1;
    }
  }, [timerActive, timerValue]);

  // Polling: fetch stage state every 1.2s
  const pollStage = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/api/stage/${id}`);
      if (!res.ok) return;
      const d = await res.json();

      setPhase(d.phase);
      if (d.currentQuestionIndex !== prevQIndex.current) {
        setShowOptions(false);
        prevQIndex.current = d.currentQuestionIndex;
      }
      setQuestionIndex(d.currentQuestionIndex);
      setTotalQuestions(d.totalQuestions);
      setQuestion(d.question);
      setBuzzerTeamId(d.buzzerTeamId);
      setWrongAttempts(d.wrongAttempts || 0);

      if (d.teams) {
        setScores(d.teams.map((t: any) => ({ id: t.id, name: t.name, color: t.color, score: t.score, correct: t.correct, total: t.total })));
        const connected = d.teams.filter((t: any) => t.name).map((t: any) => t.id);
        setConnectedTeamIds(connected);
      }

      // Calculate remaining timer from timerStartedAt
      if (d.timerStartedAt && d.timerSeconds > 0) {
        const elapsed = (Date.now() - d.timerStartedAt) / 1000;
        const remaining = Math.max(0, d.timerSeconds - elapsed);
        setTimerValue(remaining);
        setTimerActive(d.phase === "question" || d.phase === "rebuzz");
      } else {
        setTimerActive(false);
      }

      // Phase-specific logic
      if (d.phase === "buzzed" && d.buzzerTeamId) {
        const bt = d.teams?.find((t: any) => t.id === d.buzzerTeamId);
        if (bt) setBuzzerTeamName(bt.name);
        setBuzzerPlayerName(d.buzzerName || null);
        setAnswerResult(null);
        setSelectedOptionId(null);
      } else {
        setBuzzerPlayerName(null);
        setBuzzerTeamName("");
      }

      if (d.phase === "ended") setStep("ended");
      if (d.phase === "question" && d.wrongAttempts > 0) {
        setRebuzzOpen(true);
      } else if (d.phase === "question" && d.wrongAttempts === 0) {
        setRebuzzOpen(false);
        setAnswerResult(null);
      }
    } catch {}
  }, []);

  // Start/stop polling based on matchId and step
  useEffect(() => {
    if (!matchId || step === "create" || step === "ended") {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    pollStage(matchId);
    pollingRef.current = setInterval(() => pollStage(matchId), 1200);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [matchId, step, pollStage]);

  // Timer timeout detection
  const timeoutRef = useRef(false);
  useEffect(() => {
    if (!timerActive || timerValue > 0) { timeoutRef.current = false; return; }
    if (timeoutRef.current) return;
    timeoutRef.current = true;
    if (matchId) {
      fetch(`${BASE_URL}/api/stage/timeout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      }).catch(() => {});
    }
  }, [timerValue, timerActive, matchId]);

  const createMatch = useCallback(async () => {
    if (selectedDomains.length === 0) { setError("Select at least one domain"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/stage/create`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamCount, domains: selectedDomains, difficulty, timerSeconds, questionCount, shuffle }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setMatchId(d.matchId);
      setRoomCode(d.roomCode);
      setTeamCodes(d.teams.map((t: any) => t.code));
      const teamSetups: TeamSetup[] = d.teams.map((t: any, i: number) => ({
        id: t.id, name: TEAM_NAMES[i] || `TEAM ${i + 1}`,
        color: COLORS[i % COLORS.length].id, emblem: EMBLEMS[i % EMBLEMS.length].id, tacticalLoadout: [],
      }));
      setTeams(teamSetups);
      setScores(d.teams.map((t: any) => ({ id: t.id, name: "", color: t.color, score: 0, correct: 0, total: 0 })));
      setStep("config");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [teamCount, selectedDomains, difficulty, timerSeconds, questionCount, shuffle, token]);

  const updateTeam = useCallback((index: number, updates: Partial<TeamSetup>) => {
    setTeams(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  }, []);

  const toggleLoadout = useCallback((teamIndex: number, moduleId: string) => {
    setTeams(prev => prev.map((t, i) => {
      if (i !== teamIndex) return t;
      const loadout = t.tacticalLoadout.includes(moduleId)
        ? t.tacticalLoadout.filter(m => m !== moduleId)
        : t.tacticalLoadout.length < 3 ? [...t.tacticalLoadout, moduleId] : t.tacticalLoadout;
      return { ...t, tacticalLoadout: loadout };
    }));
  }, []);

  const finishConfig = useCallback(async () => {
    if (!matchId) return;
    if (teams.filter(t => t.name).length < 1) { setError("At least one team needs a name"); return; }
    setLoading(true);
    try {
      await fetch(`${BASE_URL}/api/stage/batch-config`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId, teams: teams.map((t, i) => ({ teamIndex: i, name: t.name, color: COLORS.find(c => c.id === t.color)?.hex || t.color, emblem: t.emblem, tacticalLoadout: t.tacticalLoadout })) }),
      });
      setStep("loadout");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [matchId, teams, token]);

  const finishLoadout = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      await fetch(`${BASE_URL}/api/stage/batch-config`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId, teams: teams.map((t, i) => ({ teamIndex: i, name: t.name, color: COLORS.find(c => c.id === t.color)?.hex || t.color, emblem: t.emblem, tacticalLoadout: t.tacticalLoadout })) }),
      });
      setStep("lobby");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [matchId, teams, token]);

  const startMatch = useCallback(async () => {
    if (!matchId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/stage/start`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setStep("stage");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [matchId, token]);

  const handleOptionClick = useCallback(async (optionId: number) => {
    if (!matchId || buzzerTeamId === null || selectedOptionId !== null) return;
    if (answerResult?.rebuzz) return;
    setSelectedOptionId(optionId);
    try {
      const res = await fetch(`${BASE_URL}/api/stage/answer`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId, optionId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");

      if (d.rebuzz) {
        setAnswerResult({ correct: false, teamName: buzzerTeamName, points: 0, pointsLost: d.pointsLost, newScore: d.newScore, rebuzz: true });
        setRebuzzOpen(true);
        setRebuzzExcludedTeam(buzzerTeamName);
        setWrongAttempts(1);
        setBuzzerTeamId(null);
        setBuzzerTeamName("");
        setSelectedOptionId(null);
      } else {
        setAnswerResult({ correct: d.correct, teamName: buzzerTeamName, points: d.pointsGained || 0, pointsLost: d.pointsLost, newScore: d.newScore });
      }
    } catch (e: any) { setError(e.message); }
  }, [matchId, buzzerTeamId, buzzerTeamName, selectedOptionId, answerResult, token]);

  const handleMarkCorrect = useCallback(async () => {
    if (!matchId || buzzerTeamId === null) return;
    setSelectedOptionId(null);
    try {
      const res = await fetch(`${BASE_URL}/api/stage/mark-correct`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setAnswerResult({ correct: true, teamName: buzzerTeamName, points: d.pointsGained, mode: "verbal", newScore: d.newScore });
    } catch (e: any) { setError(e.message); }
  }, [matchId, buzzerTeamId, buzzerTeamName, token]);

  const nextQuestion = useCallback(async () => {
    if (!matchId) return;
    setBuzzerTeamId(null); setSelectedOptionId(null); setAnswerResult(null);
    setRebuzzOpen(false); setWrongAttempts(0); setTimerActive(false);
    setShowOptions(false);
    try {
      const res = await fetch(`${BASE_URL}/api/stage/next`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      if (d.finished) setStep("ended");
    } catch (e: any) { setError(e.message); }
  }, [matchId, token]);

  if (!token) {
    return <AOSLayout><NavBar /><div className="min-h-screen flex items-center justify-center font-mono text-sm text-red-400">AUTHENTICATION REQUIRED</div></AOSLayout>;
  }

  if (step === "create") {
    return (
      <AOSLayout><NavBar />
        <div className="pt-20 min-h-screen px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h1 className="font-mono text-2xl font-black text-zinc-100">HOST <span className="text-blue-400 neon-text-blue">CONTROL</span></h1>
              <p className="font-mono text-[10px] text-zinc-600 tracking-widest mt-1">STAGE OPERATION SETUP</p>
            </motion.div>
            <div className="glass-strong cipher-border rounded-lg p-6 space-y-6">
              <div>
                <label className="font-mono text-[10px] text-zinc-600 tracking-widest block mb-2">TEAM COUNT</label>
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n} onClick={() => setTeamCount(n)}
                      className={`px-4 py-2 font-mono text-sm rounded transition-all ${teamCount === n ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] text-zinc-600 tracking-widest block mb-2">DOMAINS <span className="text-zinc-800">(max 6)</span></label>
                <div className="flex flex-wrap gap-2">
                  {domainsList.map(d => {
                    const selected = selectedDomains.includes(d.id);
                    const atMax = selectedDomains.length >= 6 && !selected;
                    return (
                      <button key={d.id} onClick={() => {
                        if (selected) setSelectedDomains(p => p.filter(x => x !== d.id));
                        else if (!atMax) setSelectedDomains(p => [...p, d.id]);
                      }}
                        className={`px-3 py-1.5 font-mono text-[11px] tracking-wider rounded transition-all ${selected ? "bg-blue-600/30 text-blue-300 border border-blue-500/40" : atMax ? "bg-zinc-950 text-zinc-800 border border-zinc-900 cursor-not-allowed" : "bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400"}`}>
                        {DOMAIN_ICONS[d.id] || "📁"} {d.label}
                      </button>
                    );
                  })}
                  {domainsList.length === 0 && <span className="font-mono text-[10px] text-zinc-700">No domains available. Add categories in admin panel.</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="font-mono text-[10px] text-zinc-600 tracking-widest">SHUFFLE QUESTIONS</label>
                <button onClick={() => setShuffle(!shuffle)}
                  className={`w-12 h-6 rounded-full transition-all border ${shuffle ? "bg-blue-600 border-blue-400" : "bg-zinc-900 border-zinc-700"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-all ${shuffle ? "ml-6" : "ml-1"}`} />
                </button>
                <span className={`font-mono text-[10px] ${shuffle ? "text-blue-400" : "text-zinc-700"}`}>{shuffle ? "RANDOM" : "ORDERED"}</span>
              </div>
              <div>
                <label className="font-mono text-[10px] text-zinc-600 tracking-widest block mb-2">DIFFICULTY</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(d => (
                    <button key={d.id} onClick={() => setDifficulty(d.id)}
                      className={`px-4 py-2 font-mono text-sm rounded ${difficulty === d.id ? "bg-blue-600 text-white shadow-lg" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>
                      <span className={difficulty === d.id ? "text-white" : d.color}>{d.label}</span>
                      <span className="text-zinc-700 ml-1">{d.mult}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] text-zinc-600 tracking-widest block mb-2">TIMER</label>
                <div className="flex gap-2">
                  {[15, 20, 30, 45, 60].map(t => (
                    <button key={t} onClick={() => setTimerSeconds(t)}
                      className={`px-4 py-2 font-mono text-sm rounded ${timerSeconds === t ? "bg-blue-600 text-white shadow-lg" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>{t}s</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] text-zinc-600 tracking-widest block mb-2">QUESTIONS</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map(n => (
                    <button key={n} onClick={() => setQuestionCount(n)}
                      className={`px-4 py-2 font-mono text-sm rounded ${questionCount === n ? "bg-blue-600 text-white shadow-lg" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}>{n}</button>
                  ))}
                </div>
              </div>
              {error && <div className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-4 py-2">{error}</div>}
              <button onClick={createMatch} disabled={loading}
                className="w-full py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg disabled:opacity-30">
                {loading ? <span className="animate-pulse">INITIALIZING...</span> : "◈ CREATE STAGE OPERATION ◈"}
              </button>
            </div>
          </div>
        </div>
      </AOSLayout>
    );
  }

  if (step === "config") {
    return (
      <AOSLayout showPacketRain><NavBar />
        <div className="pt-20 min-h-screen px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h1 className="font-mono text-2xl font-black text-zinc-100">TEAM <span className="text-blue-400 neon-text-blue">CONFIGURATION</span></h1>
              <p className="font-mono text-[10px] text-zinc-600 tracking-widest mt-1">CONFIGURE EACH INTELLIGENCE UNIT</p>
            </motion.div>
            <div className="space-y-4">
              {teams.map((team, i) => {
                const tc = COLORS.find(c => c.id === team.color);
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="glass rounded-lg p-5 border" style={{ borderColor: `${tc?.hex}40` }}>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="font-mono text-xs text-zinc-600 w-16">TEAM {i + 1}</span>
                      <span className="font-mono text-[10px] text-yellow-400 tracking-wider">CODE: {teamCodes[i]}</span>
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                      <input value={team.name} onChange={e => updateTeam(i, { name: e.target.value })}
                        maxLength={20} placeholder="TEAM NAME"
                        className="flex-1 bg-black/40 border border-zinc-700/60 rounded px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-700 focus:border-blue-500/60 focus:outline-none"
                        style={{ borderColor: team.name ? `${tc?.hex}60` : undefined }} />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[10px] text-zinc-600 w-16">EMBLEM</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {EMBLEMS.slice(0, 8).map(e => (
                          <button key={e.id} onClick={() => updateTeam(i, { emblem: e.id })}
                            className={`w-9 h-9 rounded-lg text-base flex items-center justify-center transition-all ${team.emblem === e.id ? "bg-blue-500/10 border border-blue-500/60" : "bg-black/20 border border-zinc-800/60 hover:border-zinc-600/60"}`}>{e.icon}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-600 w-16">COLOR</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {COLORS.map(c => (
                          <button key={c.id} onClick={() => updateTeam(i, { color: c.id })}
                            className="w-7 h-7 rounded-full transition-all"
                            style={{ backgroundColor: c.hex, boxShadow: team.color === c.id ? `0 0 0 3px ${c.hex}88` : undefined, opacity: team.color === c.id ? 1 : 0.5 }} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {error && <div className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-4 py-2">{error}</div>}
              <button onClick={finishConfig} disabled={loading || teams.filter(t => t.name).length < 1}
                className="w-full py-4 font-mono text-sm tracking-widest hologram-btn-blue rounded-lg disabled:opacity-30">
                {loading ? <span className="animate-pulse">SAVING...</span> : "◈ CONTINUE — TACTICAL LOADOUT ◈"}
              </button>
            </div>
          </div>
        </div>
      </AOSLayout>
    );
  }

  if (step === "loadout") {
    return (
      <AOSLayout showPacketRain><NavBar />
        <div className="pt-20 min-h-screen px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h1 className="font-mono text-2xl font-black text-zinc-100">TACTICAL <span className="text-blue-400 neon-text-blue">LOADOUT</span></h1>
              <p className="font-mono text-[10px] text-zinc-600 tracking-widest mt-1">EACH TEAM SELECTS UP TO 3 TACTICAL MODULES</p>
            </motion.div>
            <div className="space-y-6">
              {teams.map((team, i) => {
                const tc = COLORS.find(c => c.id === team.color);
                return (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
                    className="glass rounded-lg p-4 border" style={{ borderColor: `${tc?.hex}30` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-sm font-bold" style={{ color: tc?.hex }}>{team.name}</span>
                      <span className="font-mono text-[10px] text-zinc-600">{team.tacticalLoadout.length}/3</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {MODULE_OPTIONS.map(mod => {
                        const isSelected = team.tacticalLoadout.includes(mod.id);
                        return (
                          <button key={mod.id} onClick={() => toggleLoadout(i, mod.id)}
                            className={`rounded p-2 text-center border transition-all ${isSelected ? "bg-blue-500/10 border-blue-500/60" : "bg-black/20 border-zinc-800/60 hover:border-zinc-600/60"}`}>
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
              {error && <div className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-4 py-2">{error}</div>}
              <button onClick={finishLoadout} disabled={loading}
                className="w-full py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg disabled:opacity-30">
                {loading ? <span className="animate-pulse">SAVING...</span> : "◈ CONFIRM LOADOUT ◈"}
              </button>
            </div>
          </div>
        </div>
      </AOSLayout>
    );
  }

  if (step === "lobby") {
    return (
      <AOSLayout showPacketRain><NavBar />
        <div className="pt-20 min-h-screen px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h1 className="font-mono text-xl font-black text-zinc-100">OPERATION <span className="text-blue-400">LOBBY</span></h1>
              <p className="font-mono text-[10px] text-zinc-600 tracking-widest mt-1">DISTRIBUTE CODES TO TEAMS</p>
            </motion.div>
            <div className="glass-strong rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-2">ROOM CODE</div>
                  <div className="font-mono text-3xl font-black tracking-[0.3em] text-yellow-400">{roomCode}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-2">MATCH ID</div>
                  <div className="font-mono text-lg text-zinc-400 select-all cursor-pointer" onClick={() => navigator.clipboard?.writeText(String(matchId))} title="Click to copy">{matchId}</div>
                </div>
              </div>
              <div className="space-y-3">
                {teams.map((team, i) => {
                  const tc = COLORS.find(c => c.id === team.color);
                  const connected = connectedTeamIds.includes(team.id);
                  return (
                    <div key={team.id} className="flex items-center justify-between border rounded-lg px-4 py-3" style={{ borderColor: `${tc?.hex}30` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tc?.hex }} />
                        <div>
                          <span className="font-mono text-sm" style={{ color: tc?.hex }}>{team.name}</span>
                          <div className="font-mono text-[8px] text-zinc-700 tracking-widest">{EMBLEMS.find(e => e.id === team.emblem)?.icon || ""} {team.tacticalLoadout.length} modules</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {connected && <span className="font-mono text-[8px] text-green-400 tracking-widest">● CONNECTED</span>}
                        <div className="font-mono text-lg font-black tracking-widest text-yellow-400">{teamCodes[i]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 font-mono text-[10px] text-zinc-700 text-center">
                Teams connect at <span className="text-blue-400">/buzzer</span> using their 4-char code
              </div>
            </div>
            {error && <div className="mb-3 font-mono text-xs text-red-400">{error}</div>}
            <button onClick={startMatch} disabled={loading}
              className="w-full py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg disabled:opacity-30">
              {loading ? <span className="animate-pulse">LOADING QUESTIONS...</span> : "▶ START OPERATION"}
            </button>
          </div>
        </div>
      </AOSLayout>
    );
  }

  return (
    <AOSLayout showPacketRain={step === "stage"}>
      {step !== "ended" && <NavBar />}
      <div className={`min-h-screen text-white overflow-hidden relative ${step === "stage" ? "" : "pt-14"}`}>
        <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] z-50 opacity-10" />

        <div className="absolute top-0 left-0 right-0 z-40 p-4 flex items-center justify-between">
          <div className="font-mono text-xs tracking-widest text-zinc-600">
            STAGE <span className="text-blue-400">MODE</span>
            {question && <span className="ml-3 text-zinc-800">Q{questionIndex + 1}/{totalQuestions}</span>}
            {wrongAttempts > 0 && <span className="ml-3 text-yellow-400">REBUZZ</span>}
            <span className="ml-3 text-zinc-800 cursor-pointer select-all" onClick={() => navigator.clipboard?.writeText(String(matchId))} title="Copy match ID">ID: {matchId}</span>
          </div>
          <div className="flex items-center gap-2">
            {matchId && (
              <a href={`/stage-results?matchId=${matchId}`} target="_blank"
                className="font-mono text-[10px] text-yellow-500/50 hover:text-yellow-400 border border-yellow-600/20 hover:border-yellow-500/40 rounded px-2.5 py-1 transition-all">
                📋 RESULTS
              </a>
            )}
            <div className="flex items-center gap-4">
            {scores.map(t => (
              <div key={t.id} className="text-right" style={{ color: t.color }}>
                <div className="font-mono text-lg font-black">{t.score}</div>
                <div className="font-mono text-[9px] opacity-60 tracking-widest">{t.name}</div>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
          {step === "ended" ? (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-3xl text-center">
              <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-4">OPERATION COMPLETE</div>
              <div className="font-mono text-4xl font-black text-zinc-100 mb-8">MISSION <span className="text-yellow-400">COMPLETE</span></div>

              {scores.length > 0 && (() => {
                const sorted = [...scores].sort((a, b) => b.score - a.score);
                const winner = sorted[0];
                return (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
                    className="inline-block glass-strong border-2 border-yellow-500/50 rounded-2xl px-10 py-6 mb-8">
                    <div className="font-mono text-4xl mb-2">👑</div>
                    <div className="font-mono text-xs text-yellow-400 tracking-widest mb-1">WINNER</div>
                    <div className="font-mono text-3xl font-black text-white" style={{ color: winner.color }}>{winner.name}</div>
                    <div className="font-mono text-5xl font-black text-yellow-400 mt-2">{winner.score}</div>
                    <div className="font-mono text-[10px] text-zinc-600 mt-1">{winner.correct}/{winner.total} CORRECT</div>
                  </motion.div>
                );
              })()}

              <div className="max-w-lg mx-auto space-y-2 mb-8">
                {[...scores].sort((a, b) => b.score - a.score).map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                    className="glass rounded-lg px-5 py-3 flex items-center justify-between border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-sm ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-400" : i === 2 ? "text-amber-700" : "text-zinc-700"}`}>
                        #{i + 1}
                      </span>
                      <span className="font-mono text-sm font-bold" style={{ color: t.color }}>{t.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-zinc-600">{t.correct}/{t.total}</span>
                      <span className="font-mono text-lg font-black" style={{ color: t.color }}>{t.score}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4">
                <motion.button onClick={() => { setStep("create"); setMatchId(null); setAnswerResult(null); setSelectedOptionId(null); setRebuzzOpen(false); setWrongAttempts(0); }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                  className="px-8 py-3 font-mono text-sm bg-blue-600/20 text-blue-400 border border-blue-500/40 rounded-lg hover:bg-blue-600/40 transition-all">
                  ◈ PLAY AGAIN ◈
                </motion.button>
                <motion.a href={`/stage-results?matchId=${matchId}`} target="_blank"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                  className="px-8 py-3 font-mono text-sm bg-yellow-600/20 text-yellow-400 border border-yellow-500/40 rounded-lg hover:bg-yellow-600/40 transition-all inline-block">
                  📋 VIEW RESULTS
                </motion.a>
              </div>
            </motion.div>
          ) : question && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
              <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-3 text-center">
                QUESTION {questionIndex + 1}
                <span className="text-zinc-800 mx-2">//</span>
                <span className="text-blue-400">{question.category?.toUpperCase()}</span>
                <span className="text-zinc-800 mx-2">DIFF {question.difficulty}</span>
                <span className="text-zinc-800 mx-2">|</span>
                <span className="text-yellow-400">{question.points ?? 100} PTS</span>
                {wrongAttempts > 0 && <span className="text-yellow-400 mx-2">◈ SECOND CHANCE ◈</span>}
              </div>
              <div className="font-mono text-2xl md:text-4xl font-bold text-zinc-100 leading-relaxed mb-6 text-center max-w-4xl mx-auto">
                {question.questionText}
              </div>
              {question.mediaUrl && (
                <div className="max-w-2xl mx-auto mb-6 rounded-lg overflow-hidden border border-zinc-800/60">
                  {(() => {
                    const url = mediaBlobUrl || question.mediaUrl;
                    if (url.startsWith("data:audio/")) {
                      return <audio src={url} controls className="w-full p-4 bg-black/40"
                        onError={(e) => console.error("[HostControl] audio load error", (e.target as HTMLAudioElement).src?.slice(0, 80))} />;
                    }
                    if (url.startsWith("data:video/")) {
                      return <video src={url} controls className="w-full max-h-64 bg-black/40"
                        onError={(e) => console.error("[HostControl] video load error", (e.target as HTMLVideoElement).src?.slice(0, 80))} />;
                    }
                    if (question.type === "audio") {
                      return <audio src={url} controls className="w-full p-4 bg-black/40"
                        onError={(e) => console.error("[HostControl] audio load error", (e.target as HTMLAudioElement).src?.slice(0, 80))} />;
                    }
                    if (question.type === "video") {
                      return <video src={url} controls className="w-full max-h-64 bg-black/40"
                        onError={(e) => console.error("[HostControl] video load error", (e.target as HTMLVideoElement).src?.slice(0, 80))} />;
                    }
                    return <img src={url} alt="Question media" className="w-full max-h-64 object-contain bg-black/40"
                      onError={(e) => { console.error("[HostControl] image load error", (e.target as HTMLImageElement).src?.slice(0, 80)); e.currentTarget.style.display = "none"; }} />;
                  })()}
                </div>
              )}

              {/* Options — only shown when host clicks Show Options, or after answer, or during rebuzz */}
              {(showOptions || answerResult || rebuzzOpen) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto mb-4">
                  {question.options?.map((opt: any, i: number) => {
                    const isSelected = selectedOptionId === opt.id;
                    const showCorrect = answerResult !== null && !answerResult.rebuzz;
                    const isCorrectOpt = showCorrect && answerResult?.correct && isSelected;
                    const isWrongOpt = showCorrect && isSelected && !answerResult?.correct;
                    return (
                      <button key={opt.id} onClick={() => handleOptionClick(opt.id)}
                        disabled={selectedOptionId !== null || buzzerTeamId === null || answerResult?.rebuzz === true}
                        className={`text-left glass-strong border rounded-lg px-5 py-4 font-mono text-base md:text-lg text-zinc-300 transition-all ${
                          isCorrectOpt ? "border-green-500 bg-green-500/20 text-green-300" : ""
                        } ${isWrongOpt ? "border-red-500 bg-red-500/20 text-red-300" : ""}
                          ${!isSelected && !showCorrect ? "border-zinc-800/60 hover:border-blue-500/40 hover:bg-blue-500/10" : ""}
                          ${!isSelected && showCorrect ? "border-zinc-800/60 opacity-50" : ""}`}>
                        <span className="text-zinc-600 mr-3">{String.fromCharCode(65 + i)}.</span>
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              )}

              {timerActive && (
                <div className="max-w-md mx-auto mb-4">
                  <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <motion.div animate={{ width: `${(timerValue / Math.max(1, timerSeconds)) * 100}%` }}
                      className={`h-full rounded-full transition-colors ${wrongAttempts > 0 ? "bg-yellow-500" : timerValue > 10 ? "bg-blue-500" : timerValue > 5 ? "bg-yellow-500" : "bg-red-500"}`} />
                  </div>
                  <div className="font-mono text-[10px] text-zinc-700 mt-1 text-center tracking-widest">
                    {timerValue.toFixed(1)}s {wrongAttempts > 0 && <span className="text-yellow-400">(HALF TIME)</span>}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {buzzerTeamName && !answerResult && !rebuzzOpen && phase === "buzzed" && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-center">
                    <motion.div animate={{ boxShadow: ["0 0 20px rgba(239,68,68,0.3)", "0 0 80px rgba(239,68,68,0.8)", "0 0 20px rgba(239,68,68,0.3)"] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="inline-block bg-red-600/20 border-2 border-red-500 rounded-xl px-8 py-4 mb-4">
                      <div className="font-mono text-xs text-red-400 tracking-widest mb-1">{wrongAttempts > 0 ? "◈ SECOND RESPONSE ◈" : "◈ FIRST RESPONSE ◈"}</div>
                      <div className="font-mono text-2xl font-black text-white">{buzzerTeamName}</div>
                      {buzzerPlayerName && (
                        <div className="font-mono text-sm text-red-300/70 mt-1">by {buzzerPlayerName}</div>
                      )}
                    </motion.div>
                    <div className="flex justify-center gap-4">
                      {!showOptions && (
                        <button onClick={() => setShowOptions(true)}
                          className="px-8 py-3 font-mono text-sm bg-blue-600/30 text-blue-300 border border-blue-500/50 rounded-lg hover:bg-blue-600/50 transition-all">
                          ◈ SHOW OPTIONS — ¼ PTS ◈
                        </button>
                      )}
                      <button onClick={handleMarkCorrect}
                        className="px-8 py-3 font-mono text-sm bg-green-600/30 text-green-300 border border-green-500/50 rounded-lg hover:bg-green-600/50 transition-all">
                        ✓ CORRECT — FULL PTS
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {rebuzzOpen && !buzzerTeamId && phase === "question" && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
                    <motion.div animate={{ boxShadow: ["0 0 20px rgba(234,179,8,0.3)", "0 0 60px rgba(234,179,8,0.6)", "0 0 20px rgba(234,179,8,0.3)"] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block bg-yellow-600/20 border-2 border-yellow-500 rounded-xl px-8 py-4">
                      <div className="font-mono text-xs text-yellow-400 tracking-widest mb-1">◈ SECOND CHANCE ◈</div>
                      <div className="font-mono text-base text-zinc-300">{rebuzzExcludedTeam} WAS WRONG</div>
                      <div className="font-mono text-sm text-yellow-300 mt-1">REMAINING TEAMS MAY BUZZ — ½ PTS IF CORRECT</div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {answerResult && !answerResult.rebuzz && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <div className={`inline-block rounded-xl px-8 py-4 border-2 ${answerResult.correct ? "bg-green-600/20 border-green-500" : "bg-red-600/20 border-red-500"}`}>
                      <div className={`font-mono text-4xl font-black mb-1 ${answerResult.correct ? "text-green-400" : "text-red-400"}`}>
                        {answerResult.correct ? "✓ ACCESS GRANTED" : "✗ ACCESS DENIED"}
                      </div>
                      {answerResult.correct && <div className="font-mono text-xl text-green-300">+{answerResult.points} PTS</div>}
                      {answerResult.pointsLost && <div className="font-mono text-xl text-red-300">-{answerResult.pointsLost} PTS</div>}
                      {answerResult.newScore !== undefined && (
                        <div className="font-mono text-sm text-zinc-500 mt-1">NEW SCORE: {answerResult.newScore}</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {!question && step === "stage" && (
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="font-mono text-xl text-blue-400 neon-text-blue tracking-widest">INITIALIZING OPERATION...</motion.div>
          )}

          {answerResult && !answerResult.rebuzz && step === "stage" && question && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
              <button onClick={nextQuestion}
                className="px-8 py-3 font-mono text-sm bg-blue-600/20 text-blue-400 border border-blue-500/40 rounded-lg hover:bg-blue-600/40 transition-all">
                → NEXT QUESTION
              </button>
            </motion.div>
          )}

          {phase === "answered" && !answerResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
              <button onClick={nextQuestion}
                className="px-8 py-3 font-mono text-sm bg-blue-600/20 text-blue-400 border border-blue-500/40 rounded-lg hover:bg-blue-600/40 transition-all">
                → NEXT QUESTION
              </button>
            </motion.div>
          )}
        </div>

        {scores.length > 0 && step === "stage" && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm border-t border-zinc-900">
            <div className="flex justify-center gap-6 p-3">
              {[...scores].sort((a, b) => b.score - a.score).map((t, i) => (
                <div key={t.id} className="flex items-center gap-2" style={{ color: t.color }}>
                  <span className="font-mono text-[10px] text-zinc-700">#{i + 1}</span>
                  <span className="font-mono text-sm font-bold">{t.name}</span>
                  <span className="font-mono text-lg font-black">{t.score}</span>
                  <span className="font-mono text-[8px] text-zinc-700">{t.correct}/{t.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="absolute bottom-16 left-0 right-0 text-center font-mono text-xs text-red-400">{error}</div>}
      </div>
    </AOSLayout>
  );
}
