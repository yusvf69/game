import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";

const BOOT_STEPS = [
  { text: "SIGNAL LOST — NODE UNREACHABLE", delay: 400, speed: 25 },
  { text: "SCANNING AVAILABLE NODES... FAILED", delay: 600, speed: 20 },
  { text: "ATTEMPTING RECONNECTION...", delay: 800, speed: 20 },
  { text: "CONNECTION TERMINATED", delay: 1000, speed: 15 },
];

export default function NotFound() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("notFound");
  }, [setBooted]);

  useEffect(() => {
    if (booted["notFound"]) setBootDone(true);
  }, [booted]);

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="notFound" alreadyBooted={bootDone} />
      <AOSLayout showHUD={false}>
        <div className="min-h-screen w-full flex items-center justify-center">
          <div className="glass-strong cipher-border rounded-lg p-10 max-w-md w-full mx-4 text-center">
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="font-mono text-6xl font-black text-red-400/60 mb-6"
            >
              ERROR 404
            </motion.div>
            <p className="font-mono text-sm text-zinc-400 mb-2 tracking-widest">NODE NOT FOUND</p>
            <p className="font-mono text-xs text-zinc-600 mb-8">
              The requested intelligence node does not exist in the Archive network.
            </p>
            <Link href="/">
              <button className="w-full py-3 font-mono text-sm tracking-widest text-blue-300 glass cipher-border rounded-lg hover:bg-blue-500/10 transition-all neon-blue">
                RETURN TO ENTRY POINT
              </button>
            </Link>
          </div>
        </div>
      </AOSLayout>
    </>
  );
}
