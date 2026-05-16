import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAOSAudio } from "@/hooks/useAOSAudio";

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function randomID(): string {
  return `NODE-${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join("")}`;
}

export default function AOSHUD() {
  const [time, setTime] = useState(formatTime);
  const [nodeId] = useState(randomID);
  const [rx, setRx] = useState(0);
  const [tx, setTx] = useState(0);
  const audio = useAOSAudio();

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime), 1000);
    const d = setInterval(() => {
      setRx((prev) => Math.min(999, prev + Math.floor(Math.random() * 20 - 5)));
      setTx((prev) => Math.min(999, prev + Math.floor(Math.random() * 10 - 3)));
    }, 2000);
    return () => { clearInterval(t); clearInterval(d); };
  }, []);

  return (
    <div className="fixed top-14 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.span
            className="font-mono text-[10px] text-green-500/60 tracking-widest"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            ARCHIVE OS // {nodeId}
          </motion.span>
          <span className="font-mono text-[10px] text-zinc-700">ENC: AES-512</span>
          <span className="font-mono text-[10px] text-zinc-700">RX: {rx} PKT</span>
          <span className="font-mono text-[10px] text-zinc-700">TX: {tx} PKT</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={audio.toggle}
            className="pointer-events-auto font-mono text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
            title="Toggle ambient audio"
          >
            {audio.isEnabled() ? "🔊 SND ON" : "🔇 SND OFF"}
          </button>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-[10px] text-zinc-600">{time} UTC</span>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent mt-1" />
    </div>
  );
}
