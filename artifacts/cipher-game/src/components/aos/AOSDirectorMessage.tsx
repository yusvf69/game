import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DirectorNote {
  text: string;
  timestamp: string;
}

export default function AOSDirectorMessage() {
  const [notes, setNotes] = useState<DirectorNote[]>([]);
  const [visible, setVisible] = useState(false);

  const pushMessage = (text: string) => {
    const note: DirectorNote = { text, timestamp: new Date().toISOString() };
    setNotes((prev) => [...prev.slice(-4), note]);
    setVisible(true);
    setTimeout(() => setVisible(false), 6000);
  };

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.text) pushMessage(e.detail.text);
    };
    window.addEventListener("aos-director" as any, handler as any);
    return () => window.removeEventListener("aos-director" as any, handler as any);
  }, []);

  return (
    <AnimatePresence>
      {visible && notes.length > 0 && (
        <motion.div
          className="fixed bottom-24 right-6 z-50 max-w-sm pointer-events-none"
          initial={{ opacity: 0, x: 40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
        >
          <div className="bg-black/80 border border-amber-700/30 rounded p-3 backdrop-blur">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-mono text-[10px] text-amber-600/80 tracking-widest">
                AI DIRECTOR // LIVE FEED
              </span>
            </div>
            {notes.slice(-2).map((note, i) => (
              <p
                key={note.timestamp + i}
                className="font-mono text-xs text-amber-400/90 leading-relaxed"
              >
                {i > 0 && <span className="text-amber-700/50">───</span>}
                {note.text}
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function fireDirectorMessage(text: string) {
  window.dispatchEvent(new CustomEvent("aos-director", { detail: { text } }));
}