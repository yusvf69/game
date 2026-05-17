import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Plus, Save, X, Star, Lock, Medal } from "lucide-react";
import { AdminPage, AdminButton, AdminInput, adminFetch } from "./AdminLayout";
import { cn } from "@/lib/utils";

const emptyForm = { seasonId: "", name: "", level: "", xpRequired: "", freeReward: "{}", premiumReward: "{}" };

export default function AdminBattlePass() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => adminFetch("/admin/battle-pass").then(r => r.json()).then(d => {
    if (d.battlePass) setTiers(d.battlePass.sort((a: any, b: any) => a.level - b.level));
  }).catch(() => setMsg("Failed to load tiers")).finally(() => setLoading(false));

  useEffect(() => { load() }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.level || !form.xpRequired) { setMsg("Name, Level, XP Required are required"); return; }
    setMsg("");
    try {
      const r = await adminFetch("/admin/battle-pass", {
        method: "POST",
        body: JSON.stringify({
          seasonId: form.seasonId || null,
          name: form.name,
          level: parseInt(form.level),
          xpRequired: parseInt(form.xpRequired),
          freeReward: form.freeReward,
          premiumReward: form.premiumReward,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setMsg("Tier created!");
        setShowForm(false);
        setForm(emptyForm);
        load();
      } else setMsg(d.error || "Failed to create tier");
    } catch { setMsg("Network error"); }
  };

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const itemAnim = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } };
  const inputClass = "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px] font-mono";

  return (
    <AdminPage title="Battle Pass" description="Manage battle pass tiers and rewards">
      {msg && (
        <div className="flex items-center justify-between mb-4 px-4 py-2 rounded-lg border bg-card/50 border-primary/30">
          <span className="text-sm text-foreground">{msg}</span>
          <button onClick={() => setMsg("")} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold text-foreground">{tiers.length} Levels</span>
        </div>
        <AdminButton onClick={() => { setShowForm(!showForm); setForm(emptyForm); }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? " Cancel" : " New Tier"}
        </AdminButton>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="p-5 rounded-xl border border-primary/20 bg-card/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Tier Name", key: "name", placeholder: "e.g. Apprentice" },
                { label: "Level", key: "level", type: "number", placeholder: "1" },
                { label: "XP Required", key: "xpRequired", type: "number", placeholder: "1000" },
                { label: "Season ID", key: "seasonId", placeholder: "Optional" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</label>
                  <AdminInput type={type || "text"} value={(form as any)[key]} onChange={v => setForm({ ...form, [key]: v })} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block"><Star size={12} className="inline mr-1 text-green-400" />Free Reward (JSON)</label>
                <textarea value={form.freeReward} onChange={e => setForm({ ...form, freeReward: e.target.value })} className={inputClass} placeholder='{"type":"badge","id":"bronze"}' />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block"><Medal size={12} className="inline mr-1 text-yellow-400" />Premium Reward (JSON)</label>
                <textarea value={form.premiumReward} onChange={e => setForm({ ...form, premiumReward: e.target.value })} className={inputClass} placeholder='{"type":"skin","id":"gold"}' />
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex gap-2 pt-2">
                <AdminButton onClick={handleSubmit}><Save size={14} className="mr-1" /> Save Tier</AdminButton>
                <AdminButton variant="ghost" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Cancel</AdminButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No battle pass tiers yet. Create your first one!</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="relative">
          <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
          {tiers.map((tier, idx) => {
            const hasPremium = tier.premiumReward && tier.premiumReward !== "{}";
            return (
              <motion.div key={tier.id || idx} variants={itemAnim} className="relative pl-14 pb-6 last:pb-0">
                <div className={cn(
                  "absolute left-3 w-[42px] h-[42px] rounded-full flex items-center justify-center text-sm font-bold border-2 z-10 bg-card shadow-md",
                  hasPremium ? "border-yellow-500 text-yellow-400 shadow-yellow-500/10" : "border-border text-muted-foreground"
                )}>{tier.level}</div>
                <div className={cn(
                  "ml-4 p-4 rounded-xl border transition-all hover:shadow-md",
                  hasPremium ? "bg-gradient-to-r from-yellow-500/5 to-transparent border-yellow-500/30" : "bg-card/30 border-border/60"
                )}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{tier.name}</h3>
                        {hasPremium && <Medal size={14} className="text-yellow-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><Lock size={11} /> {tier.xpRequired?.toLocaleString()} XP</span>
                        {tier.seasonId && <span>Season {tier.seasonId}</span>}
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", hasPremium ? "bg-gradient-to-r from-yellow-500 to-yellow-400" : "bg-primary/50")}
                          style={{ width: `${Math.min(100, (tier.level / (tiers.length || 1)) * 100)}%` }} />
                      </div>
                      <div className="flex gap-3 mt-2">
                        {tier.freeReward && tier.freeReward !== "{}" && (
                          <span className="flex items-center gap-1 text-[11px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded"><Star size={10} /> Free</span>
                        )}
                        {tier.premiumReward && tier.premiumReward !== "{}" && (
                          <span className="flex items-center gap-1 text-[11px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded"><Medal size={10} /> Premium</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <AdminButton variant="ghost" onClick={() => {
                        setForm({
                          seasonId: tier.seasonId?.toString() || "",
                          name: tier.name,
                          level: tier.level.toString(),
                          xpRequired: tier.xpRequired.toString(),
                          freeReward: typeof tier.freeReward === "string" ? tier.freeReward : JSON.stringify(tier.freeReward),
                          premiumReward: typeof tier.premiumReward === "string" ? tier.premiumReward : JSON.stringify(tier.premiumReward),
                        });
                        setShowForm(true);
                      }}><Save size={13} /></AdminButton>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AdminPage>
  );
}
