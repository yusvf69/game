import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";

const BASE_URL = import.meta.env.VITE_API_URL || "";

type Tournament = {
  id: number; name: string; description: string; type: string; status: string;
  maxParticipants: number; minLevel: number; entryFee: number; rewardXp: number; rewardCoins: number; rewardItem: string | null;
  startDate: string; endDate: string;
};

const BOOT_STEPS = [
  { text: "INITIALIZING COMPETITIVE DIVISION...", delay: 400, speed: 25 },
  { text: "LOADING TOURNAMENT DATA... OK", delay: 500, speed: 20 },
  { text: "SYNCING REGISTRATION...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

export default function TournamentsPage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("tournaments");
  }, [setBooted]);

  useEffect(() => {
    if (booted["tournaments"]) setBootDone(true);
  }, [booted]);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedT, setSelectedT] = useState<Tournament | null>(null);
  const [detail, setDetail] = useState<any>(null);

  useState(() => {
    fetch(`${BASE_URL}/api/tournaments`).then(r => r.json()).then(d => { setTournaments(d); setLoading(false); }).catch(() => setLoading(false));
  });

  function loadDetail(id: number) {
    const t = tournaments.find(t => t.id === id);
    setSelectedT(t || null);
    fetch(`${BASE_URL}/api/tournaments/${id}`).then(r => r.json()).then(setDetail);
  }

  function handleJoin(id: number) {
    const token = localStorage.getItem("cipher_token");
    fetch(`${BASE_URL}/api/tournaments/${id}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } })
      .then(r => r.json()).then(d => { if (d.success) loadDetail(id); });
  }

  const statusColors: Record<string, string> = { registration: "text-yellow-400", active: "text-green-400", finished: "text-zinc-600" };

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="tournaments" alreadyBooted={bootDone} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">
        <div className="relative max-w-5xl mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">COMPETITIVE</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">TOURNAMENTS</h1>
          </motion.div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-28 glass rounded-lg animate-pulse" />) :
              tournaments.length === 0 ? (
                <div className="glass cipher-border rounded-lg p-10 text-center">
                  <p className="font-mono text-sm text-zinc-600">NO ACTIVE TOURNAMENTS</p>
                  <p className="font-mono text-xs text-zinc-700 mt-2">Check back when a new season begins</p>
                </div>
              ) : tournaments.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass cipher-border rounded-lg p-6 cursor-pointer hover:bg-blue-500/5 transition-all"
                  onClick={() => loadDetail(t.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-mono text-xs tracking-widest mb-1 ${statusColors[t.status] || "text-zinc-500"}`}>{t.status.toUpperCase()}</p>
                      <p className="font-mono text-lg font-bold text-zinc-100">{t.name}</p>
                      <p className="font-mono text-xs text-zinc-500 mt-1">{t.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-yellow-400">{t.rewardXp} XP</p>
                      <p className="font-mono text-xs text-zinc-600">LVL {t.minLevel}+</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-[10px] font-mono text-zinc-600">
                    <span>{t.type.toUpperCase()}</span>
                    <span>{t.maxParticipants} MAX</span>
                    <span>{t.entryFee > 0 ? `${t.entryFee} COINS` : "FREE"}</span>
                  </div>
                </motion.div>
              ))
            }
          </div>

          {selectedT && detail && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setSelectedT(null); setDetail(null); }}>
              <div className="glass-strong cipher-border rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <p className={`font-mono text-xs tracking-widest ${statusColors[detail.status] || "text-zinc-500"}`}>{detail.status.toUpperCase()}</p>
                  <button onClick={() => { setSelectedT(null); setDetail(null); }} className="font-mono text-xs text-zinc-600 hover:text-white">CLOSE</button>
                </div>
                <p className="font-mono text-xl font-bold text-zinc-100 mb-2">{detail.name}</p>
                <p className="font-mono text-xs text-zinc-400 mb-6">{detail.description}</p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="font-mono text-[10px] text-zinc-600">ENTRY</p>
                    <p className="font-mono text-sm font-bold text-zinc-300">{detail.entryFee > 0 ? `${detail.entryFee} 🪙` : "FREE"}</p>
                  </div>
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="font-mono text-[10px] text-zinc-600">REWARD</p>
                    <p className="font-mono text-sm font-bold text-yellow-400">{detail.rewardXp} XP</p>
                  </div>
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="font-mono text-[10px] text-zinc-600">PLAYERS</p>
                    <p className="font-mono text-sm font-bold text-zinc-300">{detail.participants?.length || 0}/{detail.maxParticipants}</p>
                  </div>
                </div>

                {detail.matches?.length > 0 && (
                  <div className="mb-6">
                    <p className="font-mono text-xs text-zinc-600 tracking-widest mb-3">MATCHES</p>
                    <div className="space-y-2">
                      {detail.matches.map((m: any) => (
                        <div key={m.id} className="glass rounded-lg p-3 flex items-center justify-between font-mono text-xs">
                          <span className="text-zinc-300">{m.player1Name || "TBD"}</span>
                          <span className="text-zinc-600">VS</span>
                          <span className="text-zinc-300">{m.player2Name || "TBD"}</span>
                          <span className={`${m.status === "completed" ? "text-green-500" : "text-yellow-500"} tracking-widest`}>{m.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.status === "registration" && (
                  <button onClick={() => handleJoin(detail.id)} className="w-full py-4 font-mono text-sm tracking-widest text-blue-300 glass cipher-border rounded-lg hover:bg-blue-500/10 transition-all neon-blue">
                    JOIN TOURNAMENT
                  </button>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </AOSLayout>
    </>
  );
}
