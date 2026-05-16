import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";

const BASE_URL = import.meta.env.VITE_API_URL || "";

type Skill = {
  id: number; name: string; branch: string; description: string; maxLevel: number; xpCost: number;
  statBonus: Record<string, number>; parentSkillId: number | null; icon: string;
  currentLevel: number; unlocked: boolean;
};

const BOOT_STEPS = [
  { text: "INITIALIZING PROGRESSION MATRIX...", delay: 400, speed: 25 },
  { text: "LOADING SKILL BRANCHES... OK", delay: 500, speed: 20 },
  { text: "ANALYZING AGENT CAPABILITIES...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

const BRANCHES = ["intelligence", "speed", "social"];
const BRANCH_COLORS: Record<string, string> = { intelligence: "blue", speed: "orange", social: "purple" };
const BRANCH_ICONS: Record<string, string> = { intelligence: "🧠", speed: "⚡", social: "🎭" };

export default function SkillTreePage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("skillTree");
  }, [setBooted]);

  useEffect(() => {
    if (booted["skillTree"]) setBootDone(true);
  }, [booted]);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  useState(() => {
    const token = localStorage.getItem("cipher_token");
    fetch(`${BASE_URL}/api/skill-tree`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setSkills(d); setLoading(false); }).catch(() => setLoading(false));
  });

  function handleUpgrade(skillId: number) {
    const token = localStorage.getItem("cipher_token");
    fetch(`${BASE_URL}/api/skill-tree/upgrade`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ skillId }),
    }).then(r => r.json()).then(d => {
      if (d.success) {
        setSkills(prev => prev.map(s => s.id === skillId ? { ...s, currentLevel: d.newLevel, unlocked: true } : s));
        setSelectedSkill(null);
      } else { alert(d.error); }
    });
  }

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="skillTree" alreadyBooted={bootDone} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">
        <div className="relative max-w-5xl mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">PROGRESSION</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">SKILL TREE</h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BRANCHES.map((branch) => {
              const branchSkills = skills.filter(s => s.branch === branch);
              const color = BRANCH_COLORS[branch];
              const icon = BRANCH_ICONS[branch];

              return (
                <motion.div key={branch} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`glass-strong cipher-border rounded-lg p-6 border-${color}-500/20`}
                >
                  <div className="text-center mb-6">
                    <span className="text-3xl">{icon}</span>
                    <p className={`font-mono text-sm font-bold text-${color}-400 tracking-widest mt-2 uppercase`}>{branch}</p>
                  </div>
                  <div className="space-y-3">
                    {branchSkills.map((skill) => {
                      const canUpgrade = skill.currentLevel < skill.maxLevel;
                      const hasParent = skill.parentSkillId;
                      const parentUnlocked = hasParent ? skills.find(s => s.id === skill.parentSkillId)?.currentLevel! > 0 : true;
                      const locked = !parentUnlocked;

                      return (
                        <div key={skill.id} className={`glass rounded-lg p-4 border cursor-pointer transition-all ${
                          locked ? "border-zinc-800/30 opacity-40" : skill.currentLevel > 0 ? `border-${color}-500/30` : "border-zinc-700/30 hover:border-zinc-500/30"
                        }`} onClick={() => !locked && setSelectedSkill(skill)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className={`font-mono text-sm font-bold ${skill.currentLevel > 0 ? `text-${color}-300` : "text-zinc-400"}`}>{skill.name}</p>
                            <p className="font-mono text-xs text-zinc-600">LVL {skill.currentLevel}/{skill.maxLevel}</p>
                          </div>
                          {skill.currentLevel > 0 && (
                            <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                              <div className={`h-full rounded-full bg-${color}-500`} style={{ width: `${(skill.currentLevel / skill.maxLevel) * 100}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {selectedSkill && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedSkill(null)}>
              <div className="glass-strong cipher-border rounded-lg p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <p className="font-mono text-lg font-bold text-zinc-100 mb-2">{selectedSkill.icon} {selectedSkill.name}</p>
                <p className="font-mono text-xs text-zinc-400 mb-4">{selectedSkill.description}</p>
                <div className="glass rounded-lg p-4 mb-6 space-y-2">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-zinc-500">Level</span>
                    <span className="text-zinc-300">{selectedSkill.currentLevel}/{selectedSkill.maxLevel}</span>
                  </div>
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-zinc-500">XP Cost</span>
                    <span className="text-blue-400">{selectedSkill.xpCost * (selectedSkill.currentLevel + 1)}</span>
                  </div>
                  {Object.entries(selectedSkill.statBonus).map(([k, v]) => (
                    <div key={k} className="flex justify-between font-mono text-xs">
                      <span className="text-zinc-500">Bonus: {k}</span>
                      <span className="text-green-400">+{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleUpgrade(selectedSkill.id)}
                  className="w-full py-3 font-mono text-sm tracking-widest text-blue-300 glass cipher-border rounded-lg hover:bg-blue-500/10 transition-all neon-blue"
                >
                  UPGRADE ({selectedSkill.xpCost * (selectedSkill.currentLevel + 1)} XP)
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </AOSLayout>
    </>
  );
}
