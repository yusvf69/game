import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { RankBadge } from "@/components/RankBadge";
import {
  useGetCurrentUser,
  useGetGameSummary,
  useGetCurrentSeason,
  useGetDailyChallenge,
  getGetCurrentUserQueryKey,
  getGetGameSummaryQueryKey,
  getGetCurrentSeasonQueryKey,
  getGetDailyChallengeQueryKey,
} from "@workspace/api-client-react";

const XP_PER_LEVEL = 500;

function XpBar({ xp, level }: { xp: number; level: number }) {
  const levelStart = (level - 1) * XP_PER_LEVEL;
  const levelEnd = level * XP_PER_LEVEL;
  const progress = Math.min(100, ((xp - levelStart) / (levelEnd - levelStart)) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs text-zinc-500 tracking-widest">LEVEL {level}</span>
        <span className="font-mono text-xs text-blue-400">{xp.toLocaleString()} XP</span>
        <span className="font-mono text-xs text-zinc-600 tracking-widest">LEVEL {level + 1}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          className="h-full rounded-full xp-bar-glow"
          style={{ background: "linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa)" }}
        />
      </div>
      <div className="text-right">
        <span className="font-mono text-[10px] text-zinc-600">{Math.round(progress)}% TO NEXT LEVEL</span>
      </div>
    </div>
  );
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading: userLoading } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey() },
  });

  const { data: summary, isLoading: summaryLoading } = useGetGameSummary({
    query: { queryKey: getGetGameSummaryQueryKey(), enabled: !!user },
  });

  const { data: season } = useGetCurrentSeason({
    query: { queryKey: getGetCurrentSeasonQueryKey() },
  });

  const { data: daily } = useGetDailyChallenge({
    query: { queryKey: getGetDailyChallengeQueryKey(), enabled: !!user },
  });

  const isLoading = userLoading || summaryLoading;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="pt-14 min-h-screen">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center justify-between"
          >
            <div>
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">COMMAND CENTER</p>
              <h1 className="font-mono text-2xl font-bold text-zinc-100">
                WELCOME BACK, <span className="text-blue-400">{user?.username || "AGENT"}</span>
              </h1>
            </div>
            {summary && <RankBadge tier={summary.rankTier || "Bronze"} size="lg" />}
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 glass rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
              {/* XP Bar */}
              <motion.div variants={item} className="glass-strong cipher-border rounded-lg p-6">
                <XpBar xp={summary?.totalXp || 0} level={summary?.currentLevel || 1} />
              </motion.div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "STREAK", value: `${summary?.streak || 0}`, unit: "DAYS", color: "text-orange-400" },
                  { label: "RANK TIER", value: summary?.rankTier || "Bronze", unit: "", color: "text-blue-400" },
                  { label: "WEEKLY XP", value: (summary?.weeklyXp || 0).toLocaleString(), unit: "XP", color: "text-green-400" },
                  { label: "GAMES TODAY", value: `${summary?.todayGames || 0}`, unit: "", color: "text-purple-400" },
                ].map((stat) => (
                  <motion.div key={stat.label} variants={item} className="glass cipher-border rounded-lg p-5 text-center">
                    <p className="font-mono text-[10px] text-zinc-600 tracking-widest mb-2">{stat.label}</p>
                    <p className={`font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    {stat.unit && <p className="font-mono text-[10px] text-zinc-600">{stat.unit}</p>}
                  </motion.div>
                ))}
              </div>

              {/* Actions + Activity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Quick Play */}
                <motion.div variants={item} className="md:col-span-1">
                  <button
                    onClick={() => setLocation("/play")}
                    className="w-full glass-strong cipher-border rounded-lg p-8 flex flex-col items-center gap-4 hover:bg-blue-500/5 transition-all duration-300 group neon-blue"
                    data-testid="quick-play-btn"
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30 group-hover:border-blue-500/60 transition-all">
                      <span className="text-2xl text-blue-400">&#9654;</span>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-sm font-bold text-blue-300 tracking-widest">INITIATE OPERATION</p>
                      <p className="font-mono text-xs text-zinc-600 mt-1">Quick Intelligence Test</p>
                    </div>
                  </button>
                </motion.div>

                {/* Daily Challenge */}
                <motion.div variants={item} className="md:col-span-1">
                  <button
                    onClick={() => setLocation("/play?mode=daily")}
                    className="w-full h-full glass rounded-lg p-6 flex flex-col justify-between hover:bg-yellow-500/5 transition-all duration-300 border border-yellow-500/20 hover:border-yellow-500/40"
                  >
                    <div>
                      <p className="font-mono text-xs text-zinc-500 tracking-widest mb-1">DAILY BRIEF</p>
                      <p className="font-mono text-base font-bold text-yellow-400">MISSION DOSSIER</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-zinc-600">{daily?.questions?.length || 5} CLASSIFIED QUESTIONS</p>
                      <p className="font-mono text-xs text-yellow-500/70 mt-1">+{daily?.bonusXp || 150} BONUS XP</p>
                    </div>
                  </button>
                </motion.div>

                {/* Season Info */}
                <motion.div variants={item} className="md:col-span-1">
                  <div className="glass rounded-lg p-6 h-full border border-purple-500/20">
                    <p className="font-mono text-xs text-zinc-500 tracking-widest mb-2">ACTIVE SEASON</p>
                    <p className="font-mono text-sm font-bold text-purple-300">{season?.name || "Season 1"}</p>
                    <p className="font-mono text-xs text-zinc-600 mt-1">{season?.theme || "The Awakening"}</p>
                    <p className="font-mono text-xs text-zinc-700 mt-3">ENDS {season?.endDate || "2040-03-31"}</p>
                  </div>
                </motion.div>
              </div>

              {/* Recent Activity */}
              <motion.div variants={item} className="glass cipher-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-blue-500/20" />
                  <p className="font-mono text-xs text-zinc-500 tracking-widest">RECENT INTEL</p>
                  <div className="h-px flex-1 bg-blue-500/20" />
                </div>

                {summary?.recentActivity && summary.recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {summary.recentActivity.map((act: { type: string; description: string; xpGained: number; timestamp: string }, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                        <div>
                          <p className="font-mono text-xs text-zinc-300">{act.description}</p>
                          <p className="font-mono text-[10px] text-zinc-600">
                            {new Date(act.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-green-400">+{act.xpGained} XP</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-xs text-zinc-600 text-center py-4">NO RECENT ACTIVITY — BEGIN AN OPERATION</p>
                )}
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
