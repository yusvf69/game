import { create } from "zustand";

export interface AOSAlert {
  id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: number;
}

interface AOSState {
  booted: Record<string, boolean>;
  alerts: AOSAlert[];
  glitchActive: boolean;
  glitchIntensity: number;
  setBooted: (page: string) => void;
  addAlert: (alert: Omit<AOSAlert, "id" | "timestamp">) => void;
  removeAlert: (id: string) => void;
  triggerGlitch: (intensity?: number) => void;
  clearGlitch: () => void;
}

let alertCounter = 0;

export const useAOSStore = create<AOSState>()((set) => ({
  booted: {},
  alerts: [],
  glitchActive: false,
  glitchIntensity: 1,

  setBooted: (page: string) =>
    set((s: AOSState) => ({ booted: { ...s.booted, [page]: true } })),

  addAlert: (alert: Omit<AOSAlert, "id" | "timestamp">) =>
    set((s: AOSState) => ({
      alerts: [
        ...s.alerts,
        { ...alert, id: `alert-${++alertCounter}`, timestamp: Date.now() },
      ].slice(-5),
    })),

  removeAlert: (id: string) =>
    set((s: AOSState) => ({ alerts: s.alerts.filter((a: AOSAlert) => a.id !== id) })),

  triggerGlitch: (intensity = 1) =>
    set({ glitchActive: true, glitchIntensity: intensity }),

  clearGlitch: () => set({ glitchActive: false, glitchIntensity: 1 }),
}));
