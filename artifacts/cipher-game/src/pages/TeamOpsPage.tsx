import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";
import { useAOSStore } from "@/stores/aosStore";
import TeamCreateCard from "@/components/team/TeamCreateCard";
import TeamLoadout from "@/components/team/TeamLoadout";
import TeamScoreboard from "@/components/team/TeamScoreboard";
import TeamStageScreen from "@/components/team/TeamStageScreen";
import { getToken } from "@/lib/auth";

const BASE_URL = import.meta.env.VITE_API_URL || "";

type PageTab = "teams" | "create" | "loadout" | "lobby" | "stage";

const BOOT_STEPS = [
  { text: "INITIALIZING TEAM OPERATIONS...", delay: 300, speed: 25 },
  { text: "SYNCING TACTICAL NETWORK...", delay: 400, speed: 20 },
  { text: "ARMING COORDINATION PROTOCOLS... OK", delay: 500, speed: 20 },
  { text: "READY", delay: 600, speed: 15 },
];

export default function TeamOpsPage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();
  const [tab, setTab] = useState<PageTab>("teams");
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTeam, setActiveTeam] = useState<any | null>(null);
  const [loadout, setLoadout] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [matchId, setMatchId] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [scores, setScores] = useState<any[]>([]);

  // Stage mode state
  const [stageQuestions, setStageQuestions] = useState<any[]>([]);
  const [stageCurrentQ, setStageCurrentQ] = useState(0);
  const [stageBuzzerTeam, setStageBuzzerTeam] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("team-ops");
  }, [setBooted]);

  useEffect(() => {
    if (booted["team-ops"]) setBootDone(true);
  }, [booted]);

  // Fetch teams on mount
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${BASE_URL}/api/team/list`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.teams) setTeams(data.teams); })
      .catch(() => {});
  }, []);

  const handleCreateTeam = useCallback(async (name: string, emblem: string, color: string, maxPlayers: number) => {
    setCreating(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/api/team/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, emblem, color, maxPlayers }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Server error: ${res.status}`);
        setCreating(false);
        return;
      }
      const data = await res.json();
      if (data.team) {
        setActiveTeam(data.team);
        setTeams((prev) => [...prev, { ...data.team, members: [{ userId: data.team.captainId }] }]);
        setTab("loadout");
      }
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : 'Connection failed'}. Is the server running?`);
    }
    setCreating(false);
  }, []);

  const handleConfirmLoadout = useCallback(async () => {
    if (!activeTeam) return;
    setError(null);
    try {
      const token = getToken();
      const loadRes = await fetch(`${BASE_URL}/api/team/loadout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId: activeTeam.id, modules: loadout }),
      });
      if (!loadRes.ok) { setError("Failed to save loadout"); return; }

      const res = await fetch(`${BASE_URL}/api/team/match/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId: activeTeam.id, mode: "live", domainMode: "randomized", difficulty: "agent" }),
      });
      if (!res.ok) { setError("Failed to create match room"); return; }
      const data = await res.json();
      if (data.match) {
        setMatchId(data.match.id);
        setRoomCode(data.roomCode);
        setTab("lobby");
      }
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : 'Connection failed'}`);
    }
  }, [activeTeam, loadout]);

  const handleStartMatch = useCallback(async () => {
    if (!matchId) return;
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/api/team/match/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId }),
      });
      if (!res.ok) { setError("Failed to start match"); return; }
      const data = await res.json();
      if (data.questions) {
        setStageQuestions(data.questions);
        setStageCurrentQ(0);
        setTab("stage");
      }
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : 'Connection failed'}`);
    }
  }, [matchId]);

  // If booting
  if (!bootDone && !booted["team-ops"]) {
    return (
      <>
        <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="team-ops" alreadyBooted={bootDone} />
        <AOSLayout><NavBar />
          <div className="pt-14 flex items-center justify-center min-h-screen">
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="font-mono text-sm text-blue-400 tracking-widest">INITIALIZING TEAM OPS...</motion.div>
          </div>
        </AOSLayout>
      </>
    );
  }

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="team-ops" alreadyBooted={true} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-mono text-2xl font-black text-zinc-100">
                  TEAM <span className="text-blue-400 neon-text-blue">OPERATIONS</span>
                </h1>
                <p className="font-mono text-[10px] text-zinc-600 tracking-widest mt-1">
                  CYBER INTELLIGENCE TOURNAMENT SYSTEM
                </p>
              </div>
              {tab !== "stage" && (
                <div className="flex gap-2">
                  {tab !== "create" && (
                    <button onClick={() => setTab("create")}
                      className="font-mono text-xs tracking-widest text-blue-300 glass border border-blue-500/30 px-4 py-2 rounded-lg hover:bg-blue-500/10 transition-all">
                      + NEW TEAM
                    </button>
                  )}
                  {tab !== "teams" && (
                    <button onClick={() => setTab("teams")}
                      className="font-mono text-xs tracking-widest text-zinc-400 glass border border-zinc-700/30 px-4 py-2 rounded-lg hover:bg-zinc-500/10 transition-all">
                      BACK
                    </button>
                  )}
                </div>
              )}
            </motion.div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {/* Teams List */}
              {tab === "teams" && (
                <motion.div key="teams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {teams.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4">🕵️</div>
                      <h2 className="font-mono text-lg font-bold text-zinc-300 mb-2">No Teams Yet</h2>
                      <p className="font-mono text-xs text-zinc-600 mb-6">Create your first intelligence team to begin operations.</p>
                      <button onClick={() => setTab("create")}
                        className="px-8 py-4 font-mono text-sm tracking-widest hologram-btn-blue rounded-lg">
                        CREATE TEAM
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teams.map((team) => (
                        <motion.div key={team.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          className="glass rounded-lg p-5 border border-zinc-800/40 flex items-center justify-between hover:border-blue-500/20 transition-all cursor-pointer"
                          onClick={() => { setActiveTeam(team); setTab("loadout"); }}>
                          <div>
                            <div className="font-mono text-base font-bold text-zinc-200">{team.name}</div>
                            <div className="font-mono text-[10px] text-zinc-600 mt-1">
                              {team.members?.length || 0}/{team.maxPlayers} operatives
                            </div>
                          </div>
                          <div className="text-2xl">
                            {team.emblem === "crown" && "👑"}
                            {team.emblem === "skull" && "💀"}
                            {team.emblem === "phoenix" && "🔥"}
                            {team.emblem === "wolf" && "🐺"}
                            {team.emblem === "eagle" && "🦅"}
                            {team.emblem === "dragon" && "🐉"}
                            {team.emblem === "cyber" && "⚡"}
                            {(!team.emblem || team.emblem === "default") && "🔰"}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Error Banner */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="glass rounded-lg p-4 mb-4 border border-red-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 text-lg">⚠</span>
                      <span className="font-mono text-xs text-red-300">{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">✕</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create Team */}
              {tab === "create" && (
                <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <TeamCreateCard onCreateTeam={handleCreateTeam} loading={creating} />
                </motion.div>
              )}

              {/* Loadout */}
              {tab === "loadout" && (
                <motion.div key="loadout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="max-w-md mx-auto space-y-4">
                    {activeTeam && (
                      <div className="glass rounded-lg p-4 border border-zinc-800/40 text-center">
                        <div className="font-mono text-lg font-bold text-zinc-200">{activeTeam.name}</div>
                        <div className="font-mono text-[10px] text-zinc-600">Configure tactical loadout</div>
                      </div>
                    )}
                    <TeamLoadout selected={loadout} onToggle={(id) => {
                      setLoadout((prev) =>
                        prev.includes(id) ? prev.filter((m) => m !== id) : prev.length < 3 ? [...prev, id] : prev
                      );
                    }} onConfirm={handleConfirmLoadout} />
                  </div>
                </motion.div>
              )}

              {/* Lobby */}
              {tab === "lobby" && (
                <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-center py-16">
                  <div className="text-5xl mb-4">🎮</div>
                  <h2 className="font-mono text-2xl font-black text-zinc-100 mb-4">
                    ROOM <span className="text-blue-400 neon-text-blue">ACTIVE</span>
                  </h2>
                  <div className="glass rounded-lg p-8 max-w-sm mx-auto border border-zinc-800/40 mb-6">
                    <p className="font-mono text-[10px] text-zinc-600 tracking-widest mb-2">ROOM CODE</p>
                    <p className="font-mono text-5xl font-black text-blue-400 tracking-[0.2em] mb-4">{roomCode}</p>
                    <p className="font-mono text-xs text-zinc-600">Share this code with your team</p>
                  </div>
                  <button onClick={handleStartMatch}
                    className="px-8 py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg">
                    START OPERATION
                  </button>
                </motion.div>
              )}

              {/* Stage / Game */}
              {tab === "stage" && matchId && (
                <motion.div key="stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <TeamStageScreen
                    matchId={matchId}
                    roomCode={roomCode}
                    questions={stageQuestions}
                    scores={scores}
                    currentQ={stageCurrentQ}
                    buzzerTeam={stageBuzzerTeam}
                    onNextQuestion={() => setStageCurrentQ((q) => Math.min(q + 1, stageQuestions.length - 1))}
                    onMarkAnswer={(teamId, correct) => {
                      setScores((prev) => prev.map((s) =>
                        s.teamId === teamId
                          ? { ...s, score: s.score + (correct ? 100 : 0), correctAnswers: s.correctAnswers + (correct ? 1 : 0), totalAnswers: s.totalAnswers + 1 }
                          : s
                      ));
                      setStageBuzzerTeam(null);
                      // Auto-advance
                      setTimeout(() => {
                        setStageCurrentQ((q) => Math.min(q + 1, stageQuestions.length - 1));
                      }, 2000);
                    }}
                    isHost={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </AOSLayout>
    </>
  );
}
