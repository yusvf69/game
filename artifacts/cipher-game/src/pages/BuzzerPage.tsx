import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function BuzzerPage() {
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [buzzed, setBuzzed] = useState(false);
  const [locked, setLocked] = useState(false);

  const handleConnect = useCallback(() => {
    if (!roomCode || !teamName) return;
    setConnected(true);
    // In real mode, would connect via Socket.IO
    // For now, simulate with local state
    setTeamId(Math.floor(Math.random() * 9999));
  }, [roomCode, teamName]);

  const handleBuzz = useCallback(() => {
    if (locked || buzzed) return;
    setBuzzed(true);
    setLocked(true);
    // Visual feedback only
    setTimeout(() => {
      setBuzzed(false);
      setLocked(false);
    }, 3000);
  }, [locked, buzzed]);

  if (!connected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong cipher-border rounded-lg p-8 max-w-sm w-full text-center"
        >
          <div className="text-4xl mb-4">🔴</div>
          <h1 className="font-mono text-xl font-black text-zinc-100 mb-2">BUZZER</h1>
          <p className="font-mono text-xs text-zinc-600 mb-6">Connect to a Stage Mode room</p>

          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] text-zinc-600 tracking-widest mb-1 block text-left">
                ROOM CODE
              </label>
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="XR82P"
                maxLength={5}
                className="w-full bg-black/40 border border-zinc-700/60 rounded px-4 py-3 font-mono text-sm text-zinc-200 placeholder-zinc-700 text-center tracking-[0.3em] focus:border-blue-500/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-zinc-600 tracking-widest mb-1 block text-left">
                TEAM NAME
              </label>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="NIGHT CROWS"
                maxLength={20}
                className="w-full bg-black/40 border border-zinc-700/60 rounded px-4 py-3 font-mono text-sm text-zinc-200 placeholder-zinc-700 focus:border-blue-500/60 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={!roomCode || !teamName}
            className="w-full mt-6 py-4 font-mono text-sm tracking-widest hologram-btn rounded-lg disabled:opacity-30"
          >
            CONNECT
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full">
        {/* Team info */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="font-mono text-[10px] text-zinc-700 tracking-widest mb-1">
            CONNECTED AS
          </div>
          <div className="font-mono text-lg font-bold text-blue-400">
            {teamName}
          </div>
          <div className="font-mono text-[10px] text-zinc-700">
            ROOM: {roomCode}
          </div>
        </motion.div>

        {/* Buzz Button */}
        <motion.button
          onClick={handleBuzz}
          disabled={locked}
          whileTap={!locked ? { scale: 0.9 } : {}}
          animate={
            locked
              ? {}
              : {
                  boxShadow: [
                    "0 0 20px rgba(239,68,68,0.3)",
                    "0 0 60px rgba(239,68,68,0.6)",
                    "0 0 20px rgba(239,68,68,0.3)",
                  ],
                }
          }
          transition={{ duration: 1.5, repeat: Infinity }}
          className={`w-48 h-48 rounded-full font-mono text-2xl font-black tracking-widest transition-all ${
            locked
              ? "bg-zinc-900 text-zinc-700 cursor-not-allowed border-4 border-zinc-800"
              : buzzed
              ? "bg-red-600 text-white border-4 border-red-400 cursor-pointer"
              : "bg-red-900/30 text-red-400 border-4 border-red-500/50 cursor-pointer hover:bg-red-800/30"
          }`}
        >
          <AnimatePresence mode="wait">
            {locked ? (
              <motion.span key="locked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                LOCKED
              </motion.span>
            ) : buzzed ? (
              <motion.span key="buzzed" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                BUZZED!
              </motion.span>
            ) : (
              <motion.span key="buzz" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                BUZZ
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Status */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-8 font-mono text-[10px] text-zinc-700 tracking-widest"
        >
          {locked ? "AWAITING RESPONSE..." : "STANDBY"}
        </motion.div>
      </div>
    </div>
  );
}
