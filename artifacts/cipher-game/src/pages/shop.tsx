import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || "";

type ShopItem = { id: number; name: string; description: string; type: string; priceCoins: number; rarity: string; iconUrl: string | null; owned: boolean };

const RARITY_COLORS: Record<string, string> = {
  common: "text-zinc-400 border-zinc-700/50",
  rare: "text-blue-400 border-blue-500/30",
  epic: "text-purple-400 border-purple-500/30",
  legendary: "text-orange-400 border-orange-500/30",
};

const RARITY_GLOWS: Record<string, string> = {
  common: "",
  rare: "shadow-blue-500/10",
  epic: "shadow-purple-500/20",
  legendary: "shadow-orange-500/30",
};

const TYPE_ICONS: Record<string, string> = {
  cosmetic: "🎨",
  boost: "⚡",
  title: "🏆",
  theme: "🎭",
  skin: "👤",
  module: "🔧",
  emblem: "🔰",
};

const BOOT_STEPS = [
  { text: "INITIALIZING ARCHIVE EXCHANGE...", delay: 400, speed: 25 },
  { text: "INDEXING AVAILABLE ITEMS... OK", delay: 500, speed: 20 },
  { text: "ESTABLISHING TRANSACTION LINK...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

function SkeletonCard() {
  return (
    <div className="glass cipher-border rounded-lg p-5 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-3/4 mb-3" />
      <div className="h-3 bg-zinc-800/60 rounded w-full mb-2" />
      <div className="h-3 bg-zinc-800/60 rounded w-2/3 mb-4" />
      <div className="h-4 bg-zinc-800 rounded w-1/3" />
    </div>
  );
}

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
  const [coins, setCoins] = useState(0);
  const [bp, setBp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [justBought, setJustBought] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("cipher_token");
    if (!token) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${token}` };
    setError(null);
    Promise.all([
      fetch(`${BASE_URL}/api/shop/items`, { headers }).then(r => { if (!r.ok) throw new Error("Failed to load shop"); return r.json(); }),
      fetch(`${BASE_URL}/api/battle-pass`, { headers }).then(r => { if (!r.ok) throw new Error("Failed to load battle pass"); return r.json(); }),
    ]).then(([shopData, bpData]) => {
      setItems(shopData.items || shopData);
      setCoins(shopData.coins ?? 0);
      setBp(bpData);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  async function handleBuy(itemId: number) {
    const token = localStorage.getItem("cipher_token");
    if (!token) return;
    setPurchasing(itemId);
    try {
      const res = await fetch(`${BASE_URL}/api/shop/buy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const d = await res.json();
      if (d.success) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, owned: true } : i));
        setCoins(d.coinsRemaining);
        setJustBought(itemId);
        toast.success("Purchase successful!", { duration: 3000 });
        setTimeout(() => setJustBought(null), 1500);
      } else {
        toast.error(d.error || "Purchase failed");
      }
    } catch {
      toast.error("Network error — try again");
    }
    setPurchasing(null);
  }

  async function handleUpgradeBP() {
    const token = localStorage.getItem("cipher_token");
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/battle-pass/upgrade`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) {
        setBp((prev: any) => ({ ...prev, isPremium: true }));
        toast.success("Battle Pass upgraded!");
      } else {
        toast.error(d.error || "Upgrade failed");
      }
    } catch {
      toast.error("Network error");
    }
  }

  const categories = [...new Set(items.map(i => i.type))];

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="shop" alreadyBooted={bootDone} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">
          <div className="relative max-w-5xl mx-auto px-4 py-8">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">ARCHIVE EXCHANGE</p>
                <h1 className="font-mono text-2xl font-bold text-zinc-100">SHOP</h1>
              </div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="font-mono text-sm text-yellow-400 border border-yellow-500/30 rounded-lg px-4 py-2">
                🪙 {coins.toLocaleString()}
              </motion.div>
            </motion.div>

            {/* Battle Pass */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-strong cipher-border rounded-lg p-6 mb-8 border-purple-500/20">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-mono text-xs text-purple-400 tracking-widest mb-1">BATTLE PASS</p>
                  <p className="font-mono text-lg font-bold text-zinc-100">
                    {bp?.isPremium ? "PREMIUM" : "FREE"} SEASON PASS
                    {bp?.isPremium && <span className="text-yellow-400 ml-2">👑</span>}
                  </p>
                </div>
                {!bp?.isPremium && (
                  <motion.button onClick={handleUpgradeBP} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="font-mono text-xs text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-lg hover:bg-yellow-500/10 transition-all">
                    UPGRADE • 1500 🪙
                  </motion.button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-xs text-zinc-500">
                  <span>LEVEL {bp?.currentLevel || 0}</span>
                  <span>{bp?.currentLevel || 0}/{bp?.maxLevel || 50}</span>
                </div>
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${((bp?.currentLevel || 0) / (bp?.maxLevel || 50)) * 100}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 xp-bar-glow" />
                </div>
              </div>
            </motion.div>

            {/* Error state */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6">
                  {error}
                  <button onClick={() => window.location.reload()} className="ml-3 text-blue-400 hover:text-blue-300">RETRY</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading skeleton */}
            {loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && items.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <div className="font-mono text-4xl mb-4">📦</div>
                <p className="font-mono text-sm text-zinc-600">NO ITEMS AVAILABLE</p>
                <p className="font-mono text-[10px] text-zinc-800 mt-2">CHECK BACK LATER FOR NEW INVENTORY</p>
              </motion.div>
            )}

            {/* Shop Items */}
            {!loading && categories.map((cat) => (
              <div key={cat} className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">{TYPE_ICONS[cat] || "📦"}</span>
                  <p className="font-mono text-xs text-zinc-600 tracking-widest uppercase">{cat} ITEMS</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.filter(i => i.type === cat).map((item, idx) => {
                    const isBuying = purchasing === item.id;
                    const isJustBought = justBought === item.id;
                    const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
                    return (
                      <motion.div key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        layout
                        className={`glass rounded-lg p-5 border transition-all ${rarityColor} ${RARITY_GLOWS[item.rarity] || ""} ${
                          item.owned ? "opacity-50" : "hover:bg-blue-500/5 hover:border-blue-500/40"
                        } ${isJustBought ? "scale-105 border-green-500/50 bg-green-500/10" : ""}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {item.iconUrl ? <img src={item.iconUrl} alt="" className="w-6 h-6 rounded" /> : <span className="text-lg">{TYPE_ICONS[item.type] || "📦"}</span>}
                            <p className="font-mono text-sm font-bold text-zinc-200">{item.name}</p>
                          </div>
                          <p className={`font-mono text-[10px] tracking-wider ${rarityColor.split(" ")[0]}`}>{item.rarity.toUpperCase()}</p>
                        </div>
                        <p className="font-mono text-xs text-zinc-500 mb-4 min-h-[2.5em]">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-xs text-yellow-400">{item.priceCoins.toLocaleString()} 🪙</p>
                          {item.owned ? (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="font-mono text-[10px] text-green-500 tracking-widest">✓ OWNED</motion.span>
                          ) : (
                            <motion.button onClick={() => handleBuy(item.id)} disabled={isBuying}
                              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                              className={`font-mono text-xs border rounded-lg px-4 py-1.5 transition-all ${
                                isBuying
                                  ? "text-zinc-600 border-zinc-800"
                                  : "text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                              }`}>
                              {isBuying ? (
                                <span className="flex items-center gap-1">⟳ BUYING</span>
                              ) : (
                                "PURCHASE"
                              )}
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AOSLayout>
    </>
  );
}
