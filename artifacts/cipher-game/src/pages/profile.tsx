import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { RankBadge } from "@/components/RankBadge";
import {
  useGetCurrentUser,
  useGetUserStats,
  useGetMyRanking,
  useGetMatches,
  useGetAiPlayerProfile,
  getGetCurrentUserQueryKey,
  getGetUserStatsQueryKey,
  getGetMyRankingQueryKey,
  getGetMatchesQueryKey,
  getGetAiPlayerProfileQueryKey,
} from "@workspace/api-client-react";

const XP_PER_LEVEL = 500;

type UserStats = { userId: number; xp: number; level: number; coins: number; rankPoints: number; streak: number; totalGames: number; wins: number; losses: number; prestigeLevel: number; rankTier: string; accuracyRate: number };
type UserProfile = { id: number; username: string; email: string | null; avatarUrl: string | null; isGuest: boolean; createdAt: string };
type AiProfile = { userId: number; strengths: string[]; weaknesses: string[]; behaviorType: string; intelligenceScore: number; learningCurve: string; recommendedDifficulty: number };
type PlayerRanking = { userId: number; mmr: number; rankTier: string; rankPoints: number; seasonId: number; position: number };
type Match = { id: number; type: string; status: string; players: Array<{ userId: number; username: string; score: number; rankChange: number; isWinner: boolean }>; createdAt: string };

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass cipher-border rounded-lg p-4 text-center">
      <p className="font-mono text-[10px] text-zinc-600 tracking-widest mb-2">{label}</p>
      <p className="font-mono text-xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="font-mono text-[10px] text-zinc-700 mt-1">{sub}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });
  const userProfile = user as UserProfile | undefined;

  const { data: stats } = useGetUserStats(
    userProfile?.id || 0,
    { query: { queryKey: getGetUserStatsQueryKey(userProfile?.id || 0), enabled: !!userProfile?.id } }
  );
  const userStats = stats as UserStats | undefined;

  const { data: ranking } = useGetMyRanking({ query: { queryKey: getGetMyRankingQueryKey() } });
  const myRanking = ranking as PlayerRanking | undefined;

  const { data: matches } = useGetMatches({ query: { queryKey: getGetMatchesQueryKey() } });
  const matchList = matches as Match[] | undefined;

  const { data: aiProfile } = useGetAiPlayerProfile({ query: { queryKey: getGetAiPlayerProfileQueryKey() } });
  const ai = aiProfile as AiProfile | undefined;

  const levelProgress = userStats ? Math.min(100, ((userStats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100) : 0;
  const winRate = userStats && userStats.totalGames > 0 ? Math.round((userStats.wins / userStats.totalGames) * 100) : 0;

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="pt-14 min-h-screen">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 py-8">
          {/* Agent Card */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong cipher-border rounded-lg p-8 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-blue-500/10 border-2 border-blue-500/40 flex items-center justify-center neon-blue">
                <span className="font-mono text-3xl font-black text-blue-400">
                  {userProfile?.username?.[0]?.toUpperCase() || "A"}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1">
                {userStats && <RankBadge tier={userStats.rankTier} size="xs" />}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">OPERATIVE FILE</p>
              <h1 className="font-mono text-2xl font-bold text-zinc-100 mb-1">{userProfile?.username || "AGENT"}</h1>
              {userProfile?.email && (
                <p className="font-mono text-xs text-zinc-600">{userProfile.email}</p>
              )}
              <div className="flex items-center gap-4 mt-3 justify-center md:justify-start">
                <span className="font-mono text-xs text-zinc-500">LEVEL {userStats?.level || 1}</span>
                <span className="font-mono text-xs text-zinc-700">|</span>
                <span className="font-mono text-xs text-zinc-500">PRESTIGE {userStats?.prestigeLevel || 0}</span>
                {userProfile?.isGuest && (
                  <span className="font-mono text-xs text-yellow-600 border border-yellow-600/30 px-2 py-0.5 rounded">GHOST</span>
                )}
              </div>

              {/* XP Bar */}
              <div className="mt-4 max-w-md">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[10px] text-zinc-600">{userStats?.xp?.toLocaleString() || 0} XP</span>
                  <span className="font-mono text-[10px] text-zinc-700">{Math.round(levelProgress)}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full xp-bar-glow"
                    style={{ background: "linear-gradient(90deg, #1d4ed8, #3b82f6)" }}
                  />
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="font-mono text-xs text-zinc-600 mb-1">GLOBAL RANK</p>
              <p className="font-mono text-4xl font-black text-blue-400">#{myRanking?.position || "—"}</p>
              <p className="font-mono text-xs text-zinc-600 mt-1">{myRanking?.rankPoints || 0} RP</p>
            </div>
          </motion.div>

          <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* Stats Grid */}
            <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="TOTAL GAMES" value={userStats?.totalGames || 0} />
              <StatCard label="WIN RATE" value={`${winRate}%`} sub={`${userStats?.wins || 0}W / ${userStats?.losses || 0}L`} />
              <StatCard label="STREAK" value={`${userStats?.streak || 0}d`} sub="ACTIVE STREAK" />
              <StatCard label="COINS" value={(userStats?.coins || 0).toLocaleString()} sub="ARCHIVE TOKENS" />
            </motion.div>

            {/* AI Intelligence Profile */}
            {ai && (
              <motion.div variants={item} className="glass cipher-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-purple-500/20" />
                  <p className="font-mono text-xs text-zinc-500 tracking-widest">AI INTELLIGENCE PROFILE</p>
                  <div className="h-px flex-1 bg-purple-500/20" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="font-mono text-xs text-zinc-600 mb-2">INTELLIGENCE SCORE</p>
                    <div className="flex items-end gap-2">
                      <span className="font-mono text-3xl font-black text-purple-400">{ai.intelligenceScore}</span>
                      <span className="font-mono text-xs text-zinc-600 mb-1">/100</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full mt-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${ai.intelligenceScore}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #7c3aed, #a855f7)" }}
                      />
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="font-mono text-[10px] text-zinc-600">TYPE: {ai.behaviorType.toUpperCase()}</p>
                      <p className="font-mono text-[10px] text-zinc-600">CURVE: {ai.learningCurve.toUpperCase()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-mono text-xs text-zinc-600 mb-3">STRENGTHS</p>
                    <div className="space-y-1">
                      {ai.strengths.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="font-mono text-xs text-zinc-300 capitalize">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-mono text-xs text-zinc-600 mb-3">VULNERABILITIES</p>
                    <div className="space-y-1">
                      {ai.weaknesses.map((w, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="font-mono text-xs text-zinc-300 capitalize">{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Match History */}
            <motion.div variants={item} className="glass cipher-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-blue-500/20" />
                <p className="font-mono text-xs text-zinc-500 tracking-widest">MATCH HISTORY</p>
                <div className="h-px flex-1 bg-blue-500/20" />
              </div>

              {matchList && matchList.length > 0 ? (
                <div className="space-y-2">
                  {matchList.slice(0, 5).map((match) => {
                    const me = match.players.find((p) => p.userId === userProfile?.id);
                    return (
                      <div key={match.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                        <div>
                          <span className={`font-mono text-xs font-bold ${me?.isWinner ? "text-green-400" : "text-red-400"}`}>
                            {me?.isWinner ? "VICTORY" : "DEFEAT"}
                          </span>
                          <span className="font-mono text-xs text-zinc-600 ml-3">{match.type.toUpperCase()}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs text-zinc-400">{me?.score || 0} pts</p>
                          <p className={`font-mono text-[10px] ${(me?.rankChange || 0) > 0 ? "text-green-500" : "text-red-500"}`}>
                            {(me?.rankChange || 0) > 0 ? "+" : ""}{me?.rankChange || 0} RP
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="font-mono text-xs text-zinc-600 text-center py-4">NO MATCHES ON RECORD</p>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
