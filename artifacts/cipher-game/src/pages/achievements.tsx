import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import {
  useGetAchievements,
  useGetUserAchievements,
  getGetAchievementsQueryKey,
  getGetUserAchievementsQueryKey,
} from "@workspace/api-client-react";

type Achievement = { id: number; name: string; description: string; rewardXp: number; iconUrl: string | null };
type UserAchievement = { achievement: Achievement; unlockedAt: string };

export default function AchievementsPage() {
  const { data: allAchievements, isLoading } = useGetAchievements({
    query: { queryKey: getGetAchievementsQueryKey() },
  });

  const { data: userAchievements } = useGetUserAchievements({
    query: { queryKey: getGetUserAchievementsQueryKey() },
  });

  const allAch = allAchievements as Achievement[] | undefined;
  const userAch = userAchievements as UserAchievement[] | undefined;

  const unlockedIds = new Set(userAch?.map((ua) => ua.achievement.id) || []);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { duration: 0.3 } } };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="pt-14 min-h-screen">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">THE ARCHIVE</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">INTELLIGENCE COMMENDATIONS</h1>
            <p className="font-mono text-xs text-zinc-600 mt-1">
              {unlockedIds.size} / {allAch?.length || 0} UNLOCKED
            </p>
          </motion.div>

          {/* Progress Bar */}
          {allAch && allAch.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass cipher-border rounded-lg p-4 mb-6"
            >
              <div className="flex justify-between mb-2">
                <span className="font-mono text-xs text-zinc-500">COMPLETION RATE</span>
                <span className="font-mono text-xs text-blue-400">
                  {Math.round((unlockedIds.size / allAch.length) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(unlockedIds.size / allAch.length) * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full xp-bar-glow"
                  style={{ background: "linear-gradient(90deg, #7c3aed, #a855f7)" }}
                />
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => <div key={i} className="h-36 glass rounded-lg animate-pulse" />)}
            </div>
          ) : allAch && allAch.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
            >
              {allAch.map((ach) => {
                const unlocked = unlockedIds.has(ach.id);
                const userAchEntry = userAch?.find((ua) => ua.achievement.id === ach.id);

                return (
                  <motion.div
                    key={ach.id}
                    variants={item}
                    className={`glass rounded-lg p-5 border transition-all duration-200 ${
                      unlocked
                        ? "border-yellow-500/30 bg-yellow-500/5"
                        : "border-zinc-800/30 opacity-60"
                    }`}
                    data-testid={`achievement-${ach.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                        unlocked
                          ? "bg-yellow-500/20 border border-yellow-500/40"
                          : "bg-zinc-800/40 border border-zinc-700/30"
                      }`}>
                        {ach.iconUrl ? (
                          <img src={ach.iconUrl} alt="" className="w-6 h-6" />
                        ) : (
                          <span style={{ filter: unlocked ? "none" : "grayscale(1)" }}>&#127942;</span>
                        )}
                      </div>
                      {unlocked && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="font-mono text-[10px] text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded"
                        >
                          EARNED
                        </motion.span>
                      )}
                    </div>

                    <p className={`font-mono text-sm font-bold mb-1 ${unlocked ? "text-zinc-100" : "text-zinc-600"}`}>
                      {ach.name}
                    </p>
                    <p className="font-mono text-xs text-zinc-600 leading-relaxed mb-3">{ach.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-blue-400">+{ach.rewardXp} XP</span>
                      {unlocked && userAchEntry && (
                        <span className="font-mono text-[10px] text-zinc-700">
                          {new Date(userAchEntry.unlockedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="glass cipher-border rounded-lg p-10 text-center">
              <p className="font-mono text-xs text-zinc-600">NO ACHIEVEMENTS AVAILABLE</p>
              <p className="font-mono text-xs text-zinc-700 mt-2">The commendation system will be populated with seed data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
