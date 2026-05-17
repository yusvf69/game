import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Award, Crown, Star, TrendingUp, Medal } from "lucide-react";
import { AdminPage, adminFetch } from "./AdminLayout";

const PRESTIGE_COLORS: Record<number, string> = {
  1: "text-slate-300 border-slate-500 bg-slate-500/10",
  2: "text-green-300 border-green-500 bg-green-500/10",
  3: "text-blue-300 border-blue-500 bg-blue-500/10",
  4: "text-purple-300 border-purple-500 bg-purple-500/10",
  5: "text-orange-300 border-orange-500 bg-orange-500/10",
  6: "text-red-300 border-red-500 bg-red-500/10",
  7: "text-pink-300 border-pink-500 bg-pink-500/10",
  8: "text-yellow-300 border-yellow-500 bg-yellow-500/10",
  9: "text-cyan-300 border-cyan-500 bg-cyan-500/10",
  10: "text-amber-300 border-amber-500 bg-amber-500/10",
};

function getPrestigeColor(level: number) {
  return PRESTIGE_COLORS[level] || "text-slate-300 border-slate-500 bg-slate-500/10";
}

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  silver: "bg-slate-400/10 text-slate-300 border-slate-400/30",
  gold: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  platinum: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  diamond: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  elite: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  legend: "bg-red-500/10 text-red-400 border-red-500/30",
  mythic: "bg-pink-500/10 text-pink-400 border-pink-500/30",
};

function getTierBadge(tier: string) {
  const color = TIER_COLORS[tier?.toLowerCase()] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${color}`}>
      {tier || "Unranked"}
    </span>
  );
}

const PODIUM_BORDERS = [
  "border-yellow-400/50 shadow-[0_0_20px_rgba(255,215,0,0.3)] bg-gradient-to-b from-yellow-500/10 to-transparent",
  "border-slate-300/50 shadow-[0_0_15px_rgba(192,192,192,0.2)] bg-gradient-to-b from-slate-300/10 to-transparent",
  "border-orange-600/50 shadow-[0_0_15px_rgba(205,127,50,0.2)] bg-gradient-to-b from-orange-600/10 to-transparent",
];

const PODIUM_ICONS = [Crown, Award, Medal];
const PODIUM_ICON_COLORS = ["text-yellow-400", "text-slate-300", "text-orange-600"];
const PODIUM_RANK_COLORS = ["text-yellow-400", "text-slate-300", "text-orange-600"];

function PodiumCard({ user, rank }: { user: any; rank: number }) {
  const Icon = PODIUM_ICONS[rank];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.15, duration: 0.4, ease: "easeOut" }}
      className={`relative rounded-xl border p-5 flex flex-col items-center gap-2 min-w-[180px] ${PODIUM_BORDERS[rank]} ${rank === 0 ? "scale-105" : "scale-95"}`}
    >
      <Icon className={`w-8 h-8 ${PODIUM_ICON_COLORS[rank]}`} />
      <span className={`text-3xl font-black ${PODIUM_RANK_COLORS[rank]}`}>#{rank + 1}</span>
      <span className="text-lg font-bold text-foreground truncate max-w-[140px]">{user.username}</span>
      <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-sm font-semibold ${getPrestigeColor(user.prestige_level)}`}>
        <Star className="w-3.5 h-3.5" /> Prestige {user.prestige_level}
      </span>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <span>Lv.{user.level}</span>
        <span>•</span>
        <span>{user.xp?.toLocaleString()} XP</span>
      </div>
      <div className="mt-1">{getTierBadge(user.rankTier)}</div>
    </motion.div>
  );
}

function LeaderboardRow({ user, index }: { user: any; index: number }) {
  const rank = index + 1;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
      className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card/30 px-5 py-3.5 transition-all hover:border-primary/30 hover:bg-card/60 hover:shadow-sm"
    >
      <span className="w-8 text-center text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
        #{rank}
      </span>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {user.username?.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-foreground truncate">{user.username}</span>
      </div>

      <span className={`hidden sm:inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${getPrestigeColor(user.prestige_level)}`}>
        <Star className="w-3 h-3" /> {user.prestige_level}
      </span>

      <span className="hidden md:inline text-xs text-muted-foreground w-16 text-right">
        Lv.{user.level}
      </span>

      <span className="hidden lg:inline text-xs text-muted-foreground w-24 text-right font-mono">
        {user.xp?.toLocaleString()} XP
      </span>

      <div className="w-24 flex justify-end">{getTierBadge(user.rankTier)}</div>
    </motion.div>
  );
}

export default function AdminPrestige() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/admin/prestige")
      .then(r => r.json())
      .then(d => {
        if (d.prestigeUsers) setUsers(d.prestigeUsers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <AdminPage title="Prestige Leaderboard">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          >
            <Trophy className="w-10 h-10 text-primary/40" />
          </motion.div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 inline mr-1.5 text-primary" />
              <span className="font-semibold text-foreground">{users.length}</span> prestige players
            </p>
          </div>

          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-4 flex-wrap">
              {top3.map((user, i) => (
                <PodiumCard key={user.id} user={user} rank={i} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leaderboard</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {rest.map((user, i) => (
                <LeaderboardRow key={user.id} user={user} index={i} />
              ))}
            </div>
          )}

          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Trophy className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No prestige players yet</p>
            </div>
          )}
        </div>
      )}
    </AdminPage>
  );
}
