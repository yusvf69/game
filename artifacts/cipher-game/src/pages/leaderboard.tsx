import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { RankBadge } from "@/components/RankBadge";
import {
  useGetGlobalLeaderboard,
  useGetDailyLeaderboard,
  useGetCurrentSeason,
  useGetMyRanking,
  getGetGlobalLeaderboardQueryKey,
  getGetDailyLeaderboardQueryKey,
  getGetCurrentSeasonQueryKey,
  getGetMyRankingQueryKey,
} from "@workspace/api-client-react";

type LeaderboardEntry = { rank: number; userId: number; username: string; avatarUrl: string | null; xp: number; level: number; rankTier: string; score: number };
type PlayerRanking = { userId: number; mmr: number; rankTier: string; rankPoints: number; seasonId: number; position: number };

function PositionIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ color: "#fbbf24", textShadow: "0 0 8px rgba(251,191,36,0.6)" }} className="font-mono font-black text-lg">1st</span>;
  if (rank === 2) return <span style={{ color: "#9ca3af" }} className="font-mono font-black text-lg">2nd</span>;
  if (rank === 3) return <span style={{ color: "#cd7f32" }} className="font-mono font-black text-lg">3rd</span>;
  return <span className="font-mono text-zinc-500 text-sm">#{rank}</span>;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"global" | "daily">("global");

  const { data: globalLb, isLoading: globalLoading } = useGetGlobalLeaderboard(
    { limit: 20 },
    { query: { queryKey: getGetGlobalLeaderboardQueryKey({ limit: 20 }) } }
  );

  const { data: dailyLb, isLoading: dailyLoading } = useGetDailyLeaderboard({
    query: { queryKey: getGetDailyLeaderboardQueryKey() },
  });

  const { data: season } = useGetCurrentSeason({
    query: { queryKey: getGetCurrentSeasonQueryKey() },
  });

  const { data: myRanking } = useGetMyRanking({
    query: { queryKey: getGetMyRankingQueryKey() },
  });

  const entries = (tab === "global" ? globalLb : dailyLb) as LeaderboardEntry[] | undefined;
  const isLoading = tab === "global" ? globalLoading : dailyLoading;
  const myRank = myRanking as PlayerRanking | undefined;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="pt-14 min-h-screen">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">THE ARCHIVE</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">AGENT RANKINGS</h1>
          </motion.div>

          {/* Season Banner */}
          {season && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass border border-purple-500/30 rounded-lg p-4 mb-6 flex items-center justify-between"
            >
              <div>
                <p className="font-mono text-xs text-zinc-500 tracking-widest">ACTIVE SEASON</p>
                <p className="font-mono text-sm font-bold text-purple-300">{season.name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-zinc-600">{season.theme}</p>
                <p className="font-mono text-xs text-zinc-700">ENDS {season.endDate}</p>
              </div>
            </motion.div>
          )}

          {/* My Rank */}
          {myRank && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-strong cipher-border rounded-lg p-5 mb-6 flex items-center justify-between"
            >
              <div>
                <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">YOUR STANDING</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-blue-400">#{myRank.position}</span>
                  <RankBadge tier={myRank.rankTier} size="md" />
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-zinc-600">RANK POINTS</p>
                <p className="font-mono text-xl font-bold text-zinc-100">{myRank.rankPoints.toLocaleString()}</p>
                <p className="font-mono text-xs text-zinc-700">MMR {myRank.mmr}</p>
              </div>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(["global", "daily"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`font-mono text-xs tracking-widest px-6 py-2 rounded border transition-all ${
                  tab === t
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                    : "glass border-zinc-700/40 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "global" ? "ALL-TIME" : "DAILY"}
              </button>
            ))}
          </div>

          {/* Leaderboard Table */}
          <motion.div
            layout
            className="glass-strong cipher-border rounded-lg overflow-hidden"
          >
            {/* Table Header */}
            <div className="grid grid-cols-[60px_1fr_120px_100px_100px] gap-4 px-6 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
              {["RANK", "AGENT", "TIER", "LEVEL", "SCORE"].map((h) => (
                <span key={h} className="font-mono text-[10px] text-zinc-600 tracking-widest">{h}</span>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="loading" className="p-6 space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 glass rounded animate-pulse" />
                  ))}
                </motion.div>
              ) : entries && entries.length > 0 ? (
                <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {entries.map((entry, i) => (
                    <motion.div
                      key={entry.userId}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="grid grid-cols-[60px_1fr_120px_100px_100px] gap-4 px-6 py-4 border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20 transition-colors"
                    >
                      <div className="flex items-center">
                        <PositionIcon rank={entry.rank} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="font-mono text-xs text-blue-400">{entry.username[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-mono text-sm text-zinc-200 truncate">{entry.username}</span>
                      </div>
                      <div className="flex items-center">
                        <RankBadge tier={entry.rankTier} size="xs" />
                      </div>
                      <div className="flex items-center">
                        <span className="font-mono text-sm text-zinc-400">Lv.{entry.level}</span>
                      </div>
                      <div className="flex items-center justify-end">
                        <span className="font-mono text-sm text-blue-400">{entry.score.toLocaleString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div key="empty" className="p-10 text-center">
                  <p className="font-mono text-xs text-zinc-600">NO AGENTS RANKED YET</p>
                  <p className="font-mono text-xs text-zinc-700 mt-2">Complete operations to appear on the board</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
