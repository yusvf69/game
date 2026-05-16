import { useCallback, useRef, useEffect } from "react";

type SoundName = "click" | "hover" | "success" | "failure" | "levelUp" | "timerWarning" | "countdown" | "matchmaking" | "victory" | "purchase";

const SOUND_CONFIG: Record<SoundName, { freq: number[]; duration: number; type: OscillatorType; volume: number }> = {
  click: { freq: [800], duration: 100, type: "sine", volume: 0.15 },
  hover: { freq: [600], duration: 50, type: "sine", volume: 0.05 },
  success: { freq: [523, 659, 784], duration: 300, type: "sine", volume: 0.2 },
  failure: { freq: [400, 300, 200], duration: 400, type: "sawtooth", volume: 0.15 },
  levelUp: { freq: [523, 659, 784, 1047], duration: 500, type: "sine", volume: 0.25 },
  timerWarning: { freq: [440], duration: 100, type: "square", volume: 0.1 },
  countdown: { freq: [1000], duration: 50, type: "sine", volume: 0.08 },
  matchmaking: { freq: [440, 550], duration: 200, type: "sine", volume: 0.15 },
  victory: { freq: [523, 659, 784, 1047], duration: 800, type: "sine", volume: 0.3 },
  purchase: { freq: [1200, 1500], duration: 200, type: "sine", volume: 0.2 },
};

export function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  useEffect(() => {
    try { audioCtxRef.current = new AudioContext(); } catch {}
    const stored = localStorage.getItem("cipher_sound_enabled");
    if (stored !== null) enabledRef.current = stored === "true";
  }, []);

  const play = useCallback((name: SoundName) => {
    if (!enabledRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    try {
      const cfg = SOUND_CONFIG[name];
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(cfg.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration / 1000);

      cfg.freq.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = cfg.type;
        osc.frequency.setValueAtTime(f, now + (i * (cfg.duration / 1000 / cfg.freq.length)));
        osc.connect(gain);
        osc.start(now + (i * (cfg.duration / 1000 / cfg.freq.length)));
        osc.stop(now + cfg.duration / 1000 + 0.05);
      });
    } catch {}
  }, []);

  const setEnabled = useCallback((val: boolean) => {
    enabledRef.current = val;
    localStorage.setItem("cipher_sound_enabled", String(val));
  }, []);

  const isEnabled = () => enabledRef.current;

  return { play, setEnabled, isEnabled };
}
