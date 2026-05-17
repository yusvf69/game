let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterVolume = 0.5;
let muted = false;

function applyVolume(): void {
  if (!masterGain) return;
  try {
    masterGain.gain.setValueAtTime(muted ? 0 : masterVolume, 0);
  } catch {}
}

function getCtx(): AudioContext | null {
  if (!ctx || !masterGain) return null;
  if (ctx.state === "closed") return null;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function playTone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  vol: number,
): void {
  const c = ctx!;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain);
  gain.connect(masterGain!);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

export function initAudio(): void {
  if (ctx) return;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    applyVolume();
  } catch {
    ctx = null;
    masterGain = null;
  }
}

export function isAudioReady(): boolean {
  return ctx !== null && masterGain !== null && ctx.state !== "closed";
}

export function setMasterVolume(vol: number): void {
  masterVolume = Math.max(0, Math.min(1, vol));
  applyVolume();
}

export function toggleMute(): boolean {
  muted = !muted;
  applyVolume();
  return muted;
}

export function playBuzzer(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  try {
    playTone(150, now, 0.3, "square", 0.35);
    playTone(180, now, 0.3, "square", 0.25);
  } catch {}
}

export function playCorrect(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  try {
    playTone(523.25, now, 0.12, "sine", 0.3);
    playTone(659.25, now + 0.08, 0.12, "sine", 0.3);
    playTone(783.99, now + 0.16, 0.12, "sine", 0.3);
    playTone(1046.50, now + 0.24, 0.18, "sine", 0.35);
  } catch {}
}

export function playWrong(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  try {
    playTone(392, now, 0.25, "sawtooth", 0.25);
    playTone(293.66, now + 0.2, 0.25, "sawtooth", 0.25);
    playTone(220, now + 0.4, 0.35, "sawtooth", 0.3);
  } catch {}
}

export function playTick(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  try {
    playTone(1000, now, 0.05, "sine", 0.15);
  } catch {}
}

export function playWarning(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  try {
    playTone(880, now, 0.1, "square", 0.35);
    playTone(880, now + 0.18, 0.1, "square", 0.35);
    playTone(880, now + 0.36, 0.15, "square", 0.4);
  } catch {}
}

export function playMatchStart(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const freqs = [261.63, 329.63, 392, 523.25, 659.25, 783.99];
  try {
    freqs.forEach((freq, i) => {
      const t = now + i * 0.14;
      playTone(freq, t, 0.12, "sine", 0.2);
      playTone(freq, t, 0.12, "triangle", 0.15);
    });
  } catch {}
}

export function playMatchEnd(victory: boolean): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  try {
    const freqs = victory
      ? [523.25, 659.25, 783.99]
      : [440, 523.25, 659.25];
    const dur = victory ? 2.0 : 1.5;
    freqs.forEach((freq) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.setValueAtTime(0.25, now + dur * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start(now);
      osc.stop(now + dur + 0.1);
    });
  } catch {}
}

export function playAnnouncer(text: string): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  try {
    const clean = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 30);
    if (!clean) return;
    const segments = Math.min(clean.length, 15);
    const segLen = Math.ceil(clean.length / segments);
    const timePerSeg = 0.12;
    for (let i = 0; i < segments; i++) {
      const segChars = clean.slice(i * segLen, (i + 1) * segLen);
      if (!segChars) continue;
      const code = segChars
        .split("")
        .reduce((s, ch) => s + ch.charCodeAt(0), 0);
      const baseFreq = 200 + (code % 400);
      const endFreq = 200 + ((code * 7) % 500);
      const t = now + i * timePerSeg;
      const osc = c.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.linearRampToValueAtTime(endFreq, t + timePerSeg);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
      gain.gain.setValueAtTime(0.12, t + timePerSeg * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + timePerSeg);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start(t);
      osc.stop(t + timePerSeg + 0.02);
    }
  } catch {}
}
