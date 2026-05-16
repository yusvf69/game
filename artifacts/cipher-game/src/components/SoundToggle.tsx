import { useState } from "react";
import { motion } from "framer-motion";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("cipher_sound_enabled") !== "false");

  function toggle() {
    const newVal = !enabled;
    setEnabled(newVal);
    localStorage.setItem("cipher_sound_enabled", String(newVal));
  }

  return (
    <button onClick={toggle} className="flex items-center gap-2 font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors" data-testid="sound-toggle">
      <span className={`text-sm ${enabled ? "text-blue-400" : "text-zinc-700"}`}>
        {enabled ? "🔊" : "🔇"}
      </span>
      <span>{enabled ? "SOUND ON" : "SOUND OFF"}</span>
    </button>
  );
}
