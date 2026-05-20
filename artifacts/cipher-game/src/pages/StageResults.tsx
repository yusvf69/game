import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AOSLayout from "@/components/aos/AOSLayout";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface ResultQuestion {
  id: number;
  questionText: string;
  difficulty: number;
  category: string;
  mediaUrl?: string | null;
  type?: string;
  options: { id: number; text: string }[];
  correctOptionIds: number[];
  points: number;
  explanation: string;
}

interface ResultTeam {
  id: number;
  name: string;
  color: string;
  score: number;
  correct: number;
  total: number;
}

export default function StageResults() {
  const params = new URLSearchParams(window.location.search);
  const matchIdParam = params.get("matchId");
  const [matchId] = useState<number | null>(matchIdParam ? parseInt(matchIdParam) : null);
  const [matchInput, setMatchInput] = useState("");
  const [questions, setQuestions] = useState<ResultQuestion[]>([]);
  const [teams, setTeams] = useState<ResultTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadResults = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/stage/${id}/results`);
      if (!res.ok) { setError("Match not found"); return; }
      const d = await res.json();
      setQuestions(d.questions || []);
      setTeams(d.teams || []);
    } catch {
      setError("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (matchId) {
      const url = new URL(window.location.href);
      url.searchParams.set("matchId", String(matchId));
      window.history.replaceState({}, "", url.toString());
      loadResults(matchId);
    }
  }, [matchId]);

  const handleConnect = () => {
    const val = parseInt(matchInput);
    if (!isNaN(val) && val > 0) {
      const url = new URL(window.location.href);
      url.searchParams.set("matchId", String(val));
      window.history.replaceState({}, "", url.toString());
      window.location.reload();
    }
  };

  const showExplanation = async (questionId: number) => {
    if (!matchId) return;
    const q = questions.find(q => q.id === questionId);
    if (!q?.explanation) return;
    try {
      await fetch(`${BASE_URL}/api/stage/${matchId}/show-explanation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ explanation: q.explanation }),
      });
    } catch {}
  };

  if (!matchId || (!loading && questions.length === 0)) {
    return (
      <AOSLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-strong cipher-border rounded-lg p-8 max-w-sm w-full text-center">
            <div className="font-mono text-4xl mb-4 text-yellow-400">📋</div>
            <h1 className="font-mono text-xl font-black text-zinc-100 mb-2">STAGE <span className="text-yellow-400">RESULTS</span></h1>
            <p className="font-mono text-[10px] text-zinc-600 tracking-widest mb-6">ENTER MATCH ID TO REVIEW</p>
            <input value={matchInput} onChange={e => setMatchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConnect()}
              placeholder="1778910326622" inputMode="numeric"
              className="w-full bg-black/40 border border-zinc-700/60 rounded px-4 py-3 font-mono text-sm text-zinc-200 placeholder-zinc-700 text-center focus:border-yellow-500/60 focus:outline-none mb-4" />
            <button onClick={handleConnect} disabled={!matchInput}
              className="w-full py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg disabled:opacity-30">
              LOAD RESULTS
            </button>
            {error && <div className="mt-4 font-mono text-xs text-red-400">{error}</div>}
            {!error && matchId && !loading && questions.length === 0 && (
              <div className="mt-4 font-mono text-xs text-zinc-600">No questions found for this match</div>
            )}
          </motion.div>
        </div>
      </AOSLayout>
    );
  }

  return (
    <AOSLayout>
      <div className="min-h-screen text-white p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="font-mono text-[10px] text-yellow-400 tracking-widest mb-2">STAGE RESULTS</div>
            <h1 className="font-mono text-2xl font-black text-zinc-100">MATCH #{matchId}</h1>
          </div>

          {teams.length > 0 && (
            <div className="mb-8 flex justify-center gap-6">
              {teams.sort((a, b) => b.score - a.score).map((t, i) => (
                <div key={t.id} className="glass-strong rounded-lg px-6 py-4 text-center" style={{ borderColor: `${t.color}40`, borderWidth: 1 }}>
                  <div className="font-mono text-[10px] text-zinc-700 mb-1">{i === 0 ? "🥇 WINNER" : `#${i + 1}`}</div>
                  <div className="font-mono text-lg font-black" style={{ color: t.color }}>{t.name}</div>
                  <div className="font-mono text-2xl font-black mt-1" style={{ color: t.color }}>{t.score}</div>
                  <div className="font-mono text-[10px] text-zinc-600 mt-1">{t.correct}/{t.total} correct</div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {questions.map((q, i) => {
              const correctLetters = q.options
                .filter(o => q.correctOptionIds.includes(o.id))
                .map(o => o.text);
              return (
                <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-strong rounded-lg border border-zinc-800/60 overflow-hidden">
                  <div className="p-4 md:p-6">
                    <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-2">
                      Q{i + 1} <span className="text-blue-400">{q.category?.toUpperCase()}</span>
                      <span className="text-zinc-800 mx-2">DIFF {q.difficulty}</span>
                      <span className="text-yellow-500">{q.points}PTS</span>
                    </div>
                    <div className="font-mono text-base md:text-lg text-zinc-100 mb-3">
                      {q.questionText}
                    </div>
                    <div className="space-y-1 mb-3">
                      {q.options.map(opt => {
                        const isCorrect = q.correctOptionIds.includes(opt.id);
                        return (
                          <div key={opt.id} className={`font-mono text-sm px-3 py-1.5 rounded border ${isCorrect ? "border-green-500/50 text-green-400 bg-green-500/10" : "border-zinc-800 text-zinc-500"}`}>
                            {isCorrect ? "✓ " : ""}{opt.text}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div>
                        <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                          className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors">
                          {expandedId === q.id ? "▲ HIDE EXPLANATION" : "▼ SHOW EXPLANATION"}
                        </button>
                        <button onClick={() => showExplanation(q.id)}
                          className="font-mono text-xs text-yellow-400 hover:text-yellow-300 transition-colors ml-4">
                          📺 SHOW ON DISPLAY
                        </button>
                        <AnimatePresence>
                          {expandedId === q.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden">
                              <div className="mt-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded font-mono text-sm text-zinc-300 leading-relaxed">
                                {q.explanation}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </AOSLayout>
  );
}
