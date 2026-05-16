import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";
import { useGetLoreEntries, getGetLoreEntriesQueryKey } from "@workspace/api-client-react";

type LoreEntry = { id: number; title: string; content: string; category: string; isSecret: boolean; unlockedAt: string | null; unlockCondition?: string | null };

const CATEGORIES = ["ALL", "WORLD", "ORGANIZATION", "CHARACTERS", "TIMELINE", "TECHNOLOGY"];

const CATEGORY_COLORS: Record<string, string> = {
  world: "text-blue-400 border-blue-500/30",
  organization: "text-purple-400 border-purple-500/30",
  characters: "text-cyan-400 border-cyan-500/30",
  timeline: "text-yellow-400 border-yellow-500/30",
  technology: "text-green-400 border-green-500/30",
  classified: "text-red-400 border-red-500/30",
};

function unlockHint(condition: string | null | undefined): string {
  if (!condition) return "";
  if (condition.startsWith("flag:")) {
    const flag = condition.replace("flag:", "");
    if (flag === "trust_vale") return "Unlocked by trusting Director Vale in Chapter 1";
    if (flag === "suspicious_vale") return "Unlocked by questioning Director Vale in Chapter 1";
    if (flag === "followed_breadcrumbs") return "Unlocked by following the breadcrumbs in Chapter 2";
    return `Unlocked by a specific story choice: ${flag.replace(/_/g, " ")}`;
  }
  if (condition.startsWith("level:")) {
    return `Requires Level ${condition.replace("level:", "")}`;
  }
  if (condition.startsWith("chapter:")) {
    return `Unlocked by completing Chapter ${condition.replace("chapter:", "")}`;
  }
  return "";
}

const BOOT_STEPS = [
  { text: "INITIALIZING CODEX DATABASE...", delay: 400, speed: 25 },
  { text: "INDEXING LORE ENTRIES... OK", delay: 500, speed: 20 },
  { text: "CROSS-REFERENCING SOURCES...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

export default function LorePage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("lore");
  }, [setBooted]);

  useEffect(() => {
    if (booted["lore"]) setBootDone(true);
  }, [booted]);

  const [activeCategory, setActiveCategory] = useState("ALL");
  const [selectedEntry, setSelectedEntry] = useState<LoreEntry | null>(null);

  const { data: loreEntries, isLoading } = useGetLoreEntries({
    query: { queryKey: getGetLoreEntriesQueryKey() },
  });

  const entries = loreEntries as LoreEntry[] | undefined;

  const filtered = entries?.filter((e) =>
    activeCategory === "ALL" || e.category.toUpperCase() === activeCategory
  );

  const unlockedCount = entries?.filter((e) => e.unlockedAt).length || 0;
  const totalCount = entries?.length || 0;

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="lore" alreadyBooted={bootDone} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">

        <div className="relative max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">THE ARCHIVE</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">WORLD CODEX</h1>
            <p className="font-mono text-xs text-zinc-600 mt-1">
              {unlockedCount} / {totalCount} ENTRIES UNLOCKED
            </p>
          </motion.div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap mb-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`font-mono text-xs tracking-widest px-3 py-1.5 rounded border transition-all ${
                  activeCategory === cat
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                    : "glass border-zinc-700/40 text-zinc-500 hover:border-blue-500/30 hover:text-zinc-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Entry Grid */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 h-fit">
              {isLoading ? (
                [...Array(6)].map((_, i) => <div key={i} className="h-28 glass rounded-lg animate-pulse" />)
              ) : filtered && filtered.length > 0 ? (
                filtered.map((entry, i) => {
                  const locked = entry.isSecret && !entry.unlockedAt;
                  const catColor = CATEGORY_COLORS[entry.category.toLowerCase()] || "text-zinc-400 border-zinc-700/30";

                  return (
                    <motion.button
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => !locked && setSelectedEntry(entry)}
                      className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                        locked
                          ? "glass border-zinc-800/30 cursor-not-allowed"
                          : selectedEntry?.id === entry.id
                            ? "glass-strong border-blue-500/50"
                            : "glass border-zinc-700/30 hover:border-blue-500/30 hover:bg-blue-500/5"
                      }`}
                      data-testid={`lore-${entry.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`font-mono text-[10px] tracking-widest border px-1.5 py-0.5 rounded ${catColor}`}>
                          {entry.category.toUpperCase()}
                        </span>
                        {locked && <span className="text-zinc-700">&#128274;</span>}
                      </div>
                      <p className={`font-mono text-sm font-bold ${locked ? "text-zinc-700" : "text-zinc-200"}`}>
                        {locked ? "CLASSIFIED" : entry.title}
                      </p>
                      {!locked && (
                        <p className="font-mono text-xs text-zinc-600 mt-1 line-clamp-2">
                          {entry.content.slice(0, 80)}...
                        </p>
                      )}
                      {locked && entry.unlockCondition && (
                        <p className="font-mono text-[10px] text-zinc-700 mt-2 italic">
                          {unlockHint(entry.unlockCondition)}
                        </p>
                      )}
                    </motion.button>
                  );
                })
              ) : (
                <div className="col-span-2 glass cipher-border rounded-lg p-10 text-center">
                  <p className="font-mono text-xs text-zinc-600">NO LORE ENTRIES FOUND</p>
                  <p className="font-mono text-xs text-zinc-700 mt-2">The codex will be populated with seed data</p>
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div>
              <AnimatePresence mode="wait">
                {selectedEntry ? (
                  <motion.div
                    key={selectedEntry.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="glass-strong cipher-border rounded-lg p-6 sticky top-20"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`font-mono text-[10px] tracking-widest border px-2 py-1 rounded ${CATEGORY_COLORS[selectedEntry.category.toLowerCase()] || "text-zinc-400 border-zinc-700/30"}`}>
                        {selectedEntry.category.toUpperCase()}
                      </span>
                      <button
                        onClick={() => setSelectedEntry(null)}
                        className="font-mono text-xs text-zinc-700 hover:text-zinc-400"
                      >
                        CLOSE
                      </button>
                    </div>
                    <h3 className="font-mono text-lg font-bold text-zinc-100 mb-4">{selectedEntry.title}</h3>
                    <p className="font-mono text-xs text-zinc-400 leading-relaxed">{selectedEntry.content}</p>
                    {selectedEntry.unlockedAt && (
                      <p className="font-mono text-[10px] text-zinc-700 mt-4 pt-4 border-t border-zinc-800">
                        UNLOCKED {new Date(selectedEntry.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass cipher-border rounded-lg p-6 text-center"
                  >
                    <p className="font-mono text-xs text-zinc-600">SELECT AN ENTRY</p>
                    <p className="font-mono text-xs text-zinc-700 mt-2">Read the full dossier</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </AOSLayout>
    </>
  );
}
