import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";
import { useAOSStore } from "@/stores/aosStore";
import { useLocalMatchStore } from "@/stores/localMatchStore";
import LocalMatchSetup from "@/components/local/LocalMatchSetup";
import LocalMatchPlay from "@/components/local/LocalMatchPlay";
import LocalMatchEnd from "@/components/local/LocalMatchEnd";
import { getToken } from "@/lib/auth";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const BOOT_STEPS = [
  { text: "INITIALIZING LOCAL OPERATION...", delay: 300, speed: 25 },
  { text: "LOADING QUESTION BANK... OK", delay: 400, speed: 20 },
  { text: "CALIBRATING LOCAL MATCH ENGINE...", delay: 500, speed: 20 },
  { text: "READY", delay: 600, speed: 15 },
];

const DOMAIN_CATEGORIES: Record<string, string[]> = {
  cyber_systems: ["technology", "cybersecurity"],
  cognitive_analysis: ["logic", "reasoning"],
  historical_archives: ["history"],
  threat_intelligence: ["security", "defense"],
  scientific_division: ["science", "physics", "biology", "chemistry"],
  behavioral_analysis: ["psychology"],
  global_mapping: ["geography"],
  cipher_division: ["cryptography"],
};

const DIFFICULTY_CONFIG: Record<string, { diffRange: number[] }> = {
  recruit: { diffRange: [1, 3] },
  agent: { diffRange: [3, 6] },
  elite: { diffRange: [5, 8] },
  omega: { diffRange: [7, 10] },
};

export default function LocalOperationPage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();
  const phase = useLocalMatchStore((s) => s.phase);
  const setQuestions = useLocalMatchStore((s) => s.setQuestions);
  const domains = useLocalMatchStore((s) => s.domains);
  const difficulty = useLocalMatchStore((s) => s.difficulty);
  const teams = useLocalMatchStore((s) => s.teams);
  const flowMode = useLocalMatchStore((s) => s.flowMode);
  const setPhase = useLocalMatchStore((s) => s.setPhase);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("local-op");
  }, [setBooted]);

  useEffect(() => {
    if (booted["local-op"]) setBootDone(true);
  }, [booted]);

  // Watch for setup completion — auto-fetch questions
  useEffect(() => {
    if (phase !== "intro" || fetching || teams.length === 0 || domains.length === 0) return;
    setFetching(true);
    setError(null);

    const questionCount = 10; // Fixed at 10 for local mode

    (async () => {
      try {
        const token = getToken();
        // Resolve DB categories from domain IDs
        const selectedCategories: string[] = [];
        for (const d of domains) {
          const cats = DOMAIN_CATEGORIES[d];
          if (cats) selectedCategories.push(...cats);
        }

        const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.agent;

        // Fetch questions from API
        const params = new URLSearchParams();
        params.set("categories", selectedCategories.join(","));
        params.set("minDiff", String(diffCfg.diffRange[0]));
        params.set("maxDiff", String(diffCfg.diffRange[1]));
        params.set("limit", String(questionCount));

        const res = await fetch(`${BASE_URL}/api/questions?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          // Fallback: generate dummy questions for offline/demo
          const dummyQuestions = Array.from({ length: questionCount }, (_, i) => ({
            id: i + 1,
            questionText: `Sample question ${i + 1} in ${selectedCategories[i % selectedCategories.length] || "general"} category.`,
            difficulty: Math.floor(Math.random() * 5) + 3,
            category: selectedCategories[i % selectedCategories.length] || "general",
            options: [
              { id: i * 4 + 1, text: "Option A" },
              { id: i * 4 + 2, text: "Option B" },
              { id: i * 4 + 3, text: "Option C" },
              { id: i * 4 + 4, text: "Option D" },
            ],
            timeLimit: 30,
            type: "text",
            correctAnswer: "Option A",
            explanation: "This is a sample explanation.",
          }));
          setQuestions(dummyQuestions);
          setPhase("playing");
          setFetching(false);
          return;
        }

        const data = await res.json();

        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions.map((q: any) => ({
            id: q.id,
            questionText: q.questionText,
            difficulty: q.difficulty,
            category: q.category,
            options: q.options || [],
            timeLimit: q.timeLimit || 30,
            type: q.type || "text",
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })));
          setPhase("playing");
        } else {
          setError("No questions found for selected domains. Try different domains.");
          setPhase("setup");
        }
      } catch (e) {
        // Network error — use demo questions
        const dummyQuestions = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          questionText: `Sample question ${i + 1}. The server is unavailable.`,
          difficulty: 5,
          category: domains[i % domains.length] || "general",
          options: [
            { id: i * 4 + 1, text: "Option A" },
            { id: i * 4 + 2, text: "Option B" },
            { id: i * 4 + 3, text: "Option C" },
            { id: i * 4 + 4, text: "Option D" },
          ],
          timeLimit: 30,
          type: "text",
        }));
        setQuestions(dummyQuestions);
        setPhase("playing");
      }
      setFetching(false);
    })();
  }, [phase]);

  if (!bootDone && !booted["local-op"]) {
    return (
      <>
        <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="local-op" alreadyBooted={bootDone} />
        <AOSLayout><NavBar />
          <div className="pt-14 flex items-center justify-center min-h-screen">
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="font-mono text-sm text-blue-400 tracking-widest">INITIALIZING LOCAL OPERATION...</motion.div>
          </div>
        </AOSLayout>
      </>
    );
  }

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="local-op" alreadyBooted={true} />
      <AOSLayout showPacketRain={phase === "playing"} showHUD={false}>
        {phase !== "playing" && <NavBar />}

        <div className={phase === "playing" ? "" : "pt-14 min-h-screen"}>
          <div className={phase === "setup" ? "max-w-4xl mx-auto px-4 py-8" : phase === "ended" ? "max-w-4xl mx-auto px-4 py-8" : ""}>
            {/* Header for setup/end */}
            {phase !== "playing" && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="font-mono text-2xl font-black text-zinc-100">
                    LOCAL <span className="text-blue-400 neon-text-blue">OPERATION</span>
                  </h1>
                  <p className="font-mono text-[10px] text-zinc-600 tracking-widest mt-1">
                    COMPETITIVE TEAM MODE — SINGLE DEVICE
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="glass rounded-lg p-4 mb-4 border border-red-500/40 flex items-center justify-between">
                  <span className="font-mono text-xs text-red-300">{error}</span>
                  <button onClick={() => setError(null)} className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fetching indicator */}
            {fetching && (
              <div className="text-center py-16">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="font-mono text-sm text-blue-400 tracking-widest">
                  LOADING INTELLIGENCE...
                </motion.div>
              </div>
            )}

            {/* Phase router */}
            {phase === "setup" && <LocalMatchSetup />}
            {phase === "ended" && <LocalMatchEnd />}
          </div>

          {phase === "playing" && <LocalMatchPlay />}
          {phase === "intro" && (
            <div className="min-h-screen flex items-center justify-center">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="font-mono text-sm text-blue-400 tracking-widest">
                PREPARING OPERATION...
              </motion.div>
            </div>
          )}
        </div>
      </AOSLayout>
    </>
  );
}
