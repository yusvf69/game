import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";

const BASE_URL = import.meta.env.VITE_API_URL || "";

type WorldEvent = {
  id: number; title: string; description: string; type: string; status: string;
  conditions: { requiredContributions: number }; rewards: { xp: number; coins: number; title?: string; item?: string; lore?: string };
  myContribution: number; totalContribution: number; progress: number;
};

const BOOT_STEPS = [
  { text: "INITIALIZING GLOBAL MONITOR...", delay: 400, speed: 25 },
  { text: "FETCHING WORLD EVENTS... OK", delay: 500, speed: 20 },
  { text: "ANALYZING INTELLIGENCE STREAMS...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

export default function WorldEventsPage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("worldEvents");
  }, [setBooted]);

  useEffect(() => {
    if (booted["worldEvents"]) setBootDone(true);
  }, [booted]);

  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    const token = localStorage.getItem("cipher_token");
    fetch(`${BASE_URL}/api/world-events`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setEvents(d); setLoading(false); }).catch(() => setLoading(false));
  });

  function handleContribute(id: number) {
    const token = localStorage.getItem("cipher_token");
    fetch(`${BASE_URL}/api/world-events/${id}/contribute`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: 1 }),
    }).then(r => r.json()).then(d => {
      if (d.success) setEvents(prev => prev.map(e => e.id === id ? { ...e, myContribution: e.myContribution + 1, totalContribution: e.totalContribution + 1, progress: Math.min(100, ((e.totalContribution + 1) / e.conditions.requiredContributions) * 100) } : e));
    });
  }

  function handleClaim(id: number) {
    const token = localStorage.getItem("cipher_token");
    fetch(`${BASE_URL}/api/world-events/${id}/claim`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  }

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="worldEvents" alreadyBooted={bootDone} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">
        <div className="relative max-w-5xl mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">LIVE WORLD</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">GLOBAL EVENTS</h1>
          </motion.div>

          {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-40 glass rounded-lg mb-4 animate-pulse" />) :
            events.map((event, i) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass-strong cipher-border rounded-lg p-6 mb-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className={`font-mono text-xs tracking-widest mb-1 ${event.status === "active" ? "text-green-400" : event.status === "upcoming" ? "text-yellow-400" : "text-zinc-600"}`}>
                      {event.status.toUpperCase()} · {event.type.toUpperCase()}
                    </p>
                    <p className="font-mono text-lg font-bold text-zinc-100">{event.title}</p>
                  </div>
                  {event.myContribution > 0 && (
                    <span className="font-mono text-[10px] text-blue-400 border border-blue-500/30 px-2 py-1 rounded">CONTRIBUTED: {event.myContribution}</span>
                  )}
                </div>
                <p className="font-mono text-xs text-zinc-400 mb-4">{event.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between font-mono text-xs text-zinc-600">
                    <span>GLOBAL PROGRESS</span>
                    <span>{Math.round(event.totalContribution || 0)} / {event.conditions.requiredContributions}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${event.progress}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full xp-bar-glow"
                      style={{ background: "linear-gradient(90deg, #3b82f6, #a855f7)" }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-3 font-mono text-[10px] text-zinc-600">
                    <span>🏆 {event.rewards.xp} XP</span>
                    <span>🪙 {event.rewards.coins}</span>
                    {event.rewards.title && <span>🎖 {event.rewards.title}</span>}
                    {event.rewards.lore && <span>📜 {event.rewards.lore}</span>}
                    {event.rewards.item && <span>📦 {event.rewards.item}</span>}
                  </div>
                  {event.status === "active" && (
                    <button onClick={() => handleContribute(event.id)} className="font-mono text-xs text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded hover:bg-blue-500/10 transition-all">
                      CONTRIBUTE
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          }

        </div>
      </div>
    </AOSLayout>
    </>
  );
}
