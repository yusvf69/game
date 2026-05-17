import { useRef, useCallback, useEffect } from "react";
import { useAOSStore } from "@/stores/aosStore";

interface AOSAudioNodes {
  droneOsc1: OscillatorNode;
  droneOsc2: OscillatorNode;
  noiseSource: AudioBufferSourceNode | null;
  masterGain: GainNode;
}

let sharedCtx: AudioContext | null = null;
let sharedNodes: AOSAudioNodes | null = null;
let activeListeners = 0;

function getCtx(): AudioContext | null {
  if (!sharedCtx) {
    try { sharedCtx = new AudioContext(); } catch { return null; }
  }
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

// Resume AudioContext on first user interaction (browser autoplay policy)
let resumeListener = false;
function ensureResumeOnGesture() {
  if (resumeListener) return;
  resumeListener = true;
  const handler = () => {
    if (sharedCtx && sharedCtx.state === "suspended") {
      sharedCtx.resume().catch(() => {});
    }
  };
  document.addEventListener("click", handler, { once: true });
  document.addEventListener("keydown", handler, { once: true });
  document.addEventListener("touchstart", handler, { once: true });
}

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function startAudio() {
  const ctxRaw = getCtx();
  if (!ctxRaw || sharedNodes) return;
  const ctx: AudioContext = ctxRaw;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
  masterGain.connect(ctx.destination);

  // Low drone 1 — deep hum
  const droneOsc1 = ctx.createOscillator();
  droneOsc1.type = "sine";
  droneOsc1.frequency.setValueAtTime(45, ctx.currentTime);
  const droneGain1 = ctx.createGain();
  droneGain1.gain.setValueAtTime(0.04, ctx.currentTime);
  droneOsc1.connect(droneGain1);
  droneGain1.connect(masterGain);
  droneOsc1.start();
  droneOsc1.frequency.linearRampToValueAtTime(48, ctx.currentTime + 8);

  // Low drone 2 — slight harmonic
  const droneOsc2 = ctx.createOscillator();
  droneOsc2.type = "sine";
  droneOsc2.frequency.setValueAtTime(62, ctx.currentTime);
  const droneGain2 = ctx.createGain();
  droneGain2.gain.setValueAtTime(0.025, ctx.currentTime);
  droneOsc2.connect(droneGain2);
  droneGain2.connect(masterGain);
  droneOsc2.start();
  droneOsc2.frequency.linearRampToValueAtTime(58, ctx.currentTime + 10);

  // Radio static noise
  const noiseBuffer = createNoiseBuffer(ctx, 4);
  function loopNoise() {
    if (!sharedNodes) return;
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.015, ctx.currentTime);
    // Filter to sound like radio static
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);
    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSource.start();
    sharedNodes.noiseSource = noiseSource;
    noiseSource.onended = loopNoise;
  }
  loopNoise();

  sharedNodes = { droneOsc1, droneOsc2, noiseSource: null, masterGain };
}

function stopAudio() {
  if (!sharedNodes || !sharedCtx) return;
  try {
    const now = sharedCtx.currentTime;
    sharedNodes.masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
    setTimeout(() => {
      if (!sharedNodes) return;
      try {
        sharedNodes.droneOsc1.stop();
        sharedNodes.droneOsc2.stop();
        sharedNodes.noiseSource?.stop();
      } catch {}
      sharedNodes = null;
    }, 600);
  } catch {}
}

function glitchBurst() {
  const ctx = sharedCtx;
  if (!ctx || !sharedNodes) return;
  const now = ctx.currentTime;
  const burst = ctx.createOscillator();
  burst.type = "sawtooth";
  burst.frequency.setValueAtTime(2000 + Math.random() * 3000, now);
  burst.frequency.exponentialRampToValueAtTime(20, now + 0.15);
  const burstGain = ctx.createGain();
  burstGain.gain.setValueAtTime(0.3, now);
  burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  burst.connect(burstGain);
  burstGain.connect(ctx.destination);
  burst.start(now);
  burst.stop(now + 0.2);
}

export function useAOSAudio() {
  const enabledRef = useRef(true);
  const glitchActive = useAOSStore((s) => s.glitchActive);
  const alerts = useAOSStore((s) => s.alerts);

  const start = useCallback(() => {
    if (!enabledRef.current) return;
    ensureResumeOnGesture();
    startAudio();
  }, []);

  const stop = useCallback(() => {
    stopAudio();
  }, []);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    if (enabledRef.current) startAudio();
    else stopAudio();
    localStorage.setItem("aos_audio_enabled", String(enabledRef.current));
  }, []);

  const isEnabled = useCallback(() => enabledRef.current, []);

  useEffect(() => {
    const stored = localStorage.getItem("aos_audio_enabled");
    if (stored !== null) enabledRef.current = stored === "true";
    if (enabledRef.current) {
      const handler = () => startAudio();
      document.addEventListener("click", handler, { once: true });
      document.addEventListener("keydown", handler, { once: true });
      document.addEventListener("touchstart", handler, { once: true });
    }
    activeListeners++;
    return () => {
      activeListeners--;
      if (activeListeners <= 0) stopAudio();
    };
  }, []);

  // Glitch burst on glitch events
  useEffect(() => {
    if (glitchActive && enabledRef.current) {
      glitchBurst();
    }
  }, [glitchActive]);

  // Alert sounds
  useEffect(() => {
    if (alerts.length > 0 && enabledRef.current) {
      const last = alerts[alerts.length - 1];
      if (last.severity === "critical") glitchBurst();
    }
  }, [alerts.length]);

  return { start, stop, toggle, isEnabled };
}