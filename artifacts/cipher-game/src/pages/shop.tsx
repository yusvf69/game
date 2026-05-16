import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";

const BASE_URL = import.meta.env.VITE_API_URL || "";

type ShopItem = { id: number; name: string; description: string; type: string; priceCoins: number; rarity: string; iconUrl: string | null; owned: boolean };

const RARITY_COLORS: Record<string, string> = { common: "text-zinc-400", rare: "text-blue-400", epic: "text-purple-400", legendary: "text-orange-400" };

const BOOT_STEPS = [
  { text: "INITIALIZING ARCHIVE EXCHANGE...", delay: 400, speed: 25 },
  { text: "INDEXING AVAILABLE ITEMS... OK", delay: 500, speed: 20 },
  { text: "ESTABLISHING TRANSACTION LINK...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

export default function ShopPage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("shop");
  }, [setBooted]);

  useEffect(() => {
    if (booted["shop"]) setBootDone(true);
  }, [booted]);

  const [items, setItems] = useState<ShopItem[]>([]);
  const [bp, setBp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    const token = localStorage.getItem("cipher_token");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${BASE_URL}/api/shop/items`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/api/battle-pass`, { headers }).then(r => r.json()),
    ]).then(([itemsData, bpData]) => { setItems(itemsData); setBp(bpData); setLoading(false); });
  });

  function handleBuy(itemId: number) {
    const token = localStorage.getItem("cipher_token");
    fetch(`${BASE_URL}/api/shop/buy`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ itemId }) })
      .then(r => r.json()).then(d => { if (d.success) setItems(prev => prev.map(i => i.id === itemId ? { ...i, owned: true } : i)); else alert(d.error); });
  }

  function handleUpgradeBP() {
    const token = localStorage.getItem("cipher_token");
    fetch(`${BASE_URL}/api/battle-pass/upgrade`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setBp((prev: any) => ({ ...prev, isPremium: true })); else alert(d.error); });
  }

  const categories = [...new Set(items.map(i => i.type))];

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="shop" alreadyBooted={bootDone} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">
        <div className="relative max-w-5xl mx-auto px-4 py-8">

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">ARCHIVE EXCHANGE</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">SHOP</h1>
          </motion.div>

          {/* Battle Pass */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong cipher-border rounded-lg p-6 mb-8 border-purple-500/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-mono text-xs text-purple-400 tracking-widest mb-1">BATTLE PASS</p>
                <p className="font-mono text-lg font-bold text-zinc-100">{bp?.isPremium ? "PREMIUM" : "FREE"} SEASON PASS</p>
              </div>
              {!bp?.isPremium && (
                <button onClick={handleUpgradeBP} className="font-mono text-xs text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded hover:bg-yellow-500/10 transition-all">
                  UPGRADE • 1500 🪙
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-xs text-zinc-500">
                <span>LEVEL {bp?.currentLevel || 0}</span>
                <span>{bp?.currentLevel || 0}/{bp?.maxLevel || 50}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-purple-500 xp-bar-glow" style={{ width: `${((bp?.currentLevel || 0) / (bp?.maxLevel || 50)) * 100}%` }} />
              </div>
            </div>
          </motion.div>

          {/* Shop Items */}
          {categories.map((cat) => (
            <div key={cat} className="mb-8">
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-4 uppercase">{cat} ITEMS</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.filter(i => i.type === cat).map((item, idx) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    className={`glass cipher-border rounded-lg p-5 ${item.owned ? "opacity-50" : "hover:bg-blue-500/5"}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-mono text-sm font-bold text-zinc-200">{item.name}</p>
                      <p className={`font-mono text-[10px] ${RARITY_COLORS[item.rarity] || "text-zinc-500"}`}>{item.rarity.toUpperCase()}</p>
                    </div>
                    <p className="font-mono text-xs text-zinc-500 mb-4">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-yellow-400">{item.priceCoins} 🪙</p>
                      {item.owned ? (
                        <span className="font-mono text-[10px] text-green-500 tracking-widest">OWNED</span>
                      ) : (
                        <button onClick={() => handleBuy(item.id)} className="font-mono text-xs text-blue-400 border border-blue-500/30 px-3 py-1 rounded hover:bg-blue-500/10 transition-all">
                          PURCHASE
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>
    </AOSLayout>
    </>
  );
}
