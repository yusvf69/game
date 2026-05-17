import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPage, adminFetch } from "./AdminLayout";
import { Zap, Save, X, GitBranch, Layers, ArrowUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const BRANCHES = ["combat", "tactical", "intelligence", "defense", "support", "stealth"];

const BRANCH_ICONS: Record<string, typeof Zap> = {
  combat: Zap, tactical: GitBranch, intelligence: Layers,
  defense: Star, support: ArrowUp, stealth: Save,
};

const BRANCH_COLORS: Record<string, string> = {
  combat: "text-red-400 border-red-500/30 bg-red-500/10",
  tactical: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  intelligence: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  defense: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  support: "text-green-400 border-green-500/30 bg-green-500/10",
  stealth: "text-orange-400 border-orange-500/30 bg-orange-500/10",
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
};

function statBonusEntries(skill: any): [string, string][] {
  if (!skill.statBonus) return [];
  const obj = typeof skill.statBonus === "string" ? JSON.parse(skill.statBonus) : skill.statBonus;
  return Object.entries(obj).map(([k, v]) => [k, String(v)]);
}

export default function AdminSkills() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/admin/skills").then(r => r.json()).then(d => {
      if (d.skills) setSkills(d.skills);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = branchFilter
    ? skills.filter(s => s.branch === branchFilter)
    : skills;

  const grouped = BRANCHES.reduce((acc, branch) => {
    const items = filtered.filter(s => s.branch === branch);
    if (items.length) acc[branch] = items;
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return (
      <AdminPage title="Skill Tree" description="Manage skill branches and upgrades">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-zinc-900/50 border border-zinc-800/60 animate-pulse" />
          ))}
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Skill Tree" description="Manage skill branches and upgrades">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-muted-foreground">
          <span className="text-primary font-semibold">{skills.length}</span> skill{skills.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setBranchFilter(null)}
          className={cn("px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
            !branchFilter ? "bg-primary/20 text-primary border-primary/40"
            : "bg-zinc-900/50 text-muted-foreground border-zinc-800/60 hover:border-zinc-700/60")}>
          All
        </button>
        {BRANCHES.map(b => {
          const Icon = BRANCH_ICONS[b];
          return (
            <button key={b} onClick={() => setBranchFilter(branchFilter === b ? null : b)}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors flex items-center gap-1.5",
                branchFilter === b ? "bg-primary/20 text-primary border-primary/40"
                : "bg-zinc-900/50 text-muted-foreground border-zinc-800/60 hover:border-zinc-700/60")}>
              <Icon className="w-3 h-3" /> {b}
            </button>
          );
        })}
        {branchFilter && (
          <button onClick={() => setBranchFilter(null)}
            className="px-2 py-1.5 rounded-lg border border-zinc-800/60 text-muted-foreground hover:text-foreground hover:border-zinc-700/60 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([branch, branchSkills]) => {
            const Icon = BRANCH_ICONS[branch] || Zap;
            const colorClasses = BRANCH_COLORS[branch] || BRANCH_COLORS.combat;
            return (
              <motion.div key={branch}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
                className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("p-2 rounded-lg border", colorClasses)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground capitalize">{branch}</h2>
                  <span className="text-xs text-muted-foreground">({branchSkills.length})</span>
                </div>

                <motion.div initial="hidden" animate="visible"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {branchSkills.map((skill) => {
                    const entries = statBonusEntries(skill);
                    return (
                      <motion.div key={skill.id} variants={cardVariants} layout
                        className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 hover:border-zinc-700/60 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="text-sm font-semibold text-foreground truncate">{skill.name}</h3>
                          {skill.parentSkillId != null && (
                            <span className="shrink-0 text-[10px] text-muted-foreground bg-zinc-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <GitBranch className="w-2.5 h-2.5" /> ID:{skill.parentSkillId}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Level</span>
                            <span className="text-foreground font-mono">{skill.level} <span className="text-muted-foreground">/</span> {skill.maxLevel}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">XP Cost</span>
                            <span className="text-yellow-400 font-mono flex items-center gap-1">
                              <ArrowUp className="w-2.5 h-2.5" /> {skill.xpCost ?? "—"}
                            </span>
                          </div>
                          {entries.length > 0 && (
                            <div className="pt-1 border-t border-zinc-800/40 mt-1.5">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                                <Star className="w-2.5 h-2.5 text-primary" /> Stat Bonus
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {entries.map(([k, v]) => (
                                  <span key={k} className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{k}:{v}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {skill.description && (
                          <p className="text-[10px] text-muted-foreground/70 mt-2 line-clamp-2 leading-relaxed">{skill.description}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            );
          })
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Zap className="w-8 h-8 text-muted-foreground/30" />
            No skills found{branchFilter ? ` for the "${branchFilter}" branch` : ""}.
          </motion.div>
        )}
      </AnimatePresence>
    </AdminPage>
  );
}
