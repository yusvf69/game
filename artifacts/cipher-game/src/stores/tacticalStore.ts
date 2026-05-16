import { create } from "zustand";

export interface ModuleDef {
  id: string;
  name: string;
  description: string;
  energyCost: number;
  category: string;
  rarity: string;
}

export interface ActiveEffect {
  moduleId: string;
  type: string;
  data: any;
  appliedAt: number;
}

interface TacticalState {
  modules: ModuleDef[];
  owned: Record<string, number>;
  tacticalEnergy: number;
  maxEnergy: number;
  activeEffects: ActiveEffect[];
  moduleLocked: boolean;
  suggestedModule: string | null;
  setModules: (modules: ModuleDef[], owned: Record<string, number>, energy: number, maxEnergy: number) => void;
  setEnergy: (energy: number) => void;
  addEffect: (effect: ActiveEffect) => void;
  clearEffects: () => void;
  consumeModule: (moduleId: string) => void;
  setModuleLocked: (locked: boolean) => void;
  setSuggestedModule: (moduleId: string | null) => void;
}

export const useTacticalStore = create<TacticalState>()((set) => ({
  modules: [],
  owned: {},
  tacticalEnergy: 0,
  maxEnergy: 10,
  activeEffects: [],
  moduleLocked: false,
  suggestedModule: null,
  setModules: (modules, owned, energy, maxEnergy) =>
    set({ modules, owned, tacticalEnergy: energy, maxEnergy }),
  setEnergy: (energy) => set({ tacticalEnergy: energy }),
  addEffect: (effect) =>
    set((s) => ({ activeEffects: [...s.activeEffects, effect] })),
  clearEffects: () => set({ activeEffects: [] }),
  consumeModule: (moduleId) =>
    set((s) => ({
      owned: {
        ...s.owned,
        [moduleId]: Math.max(0, (s.owned[moduleId] || 0) - 1),
      },
    })),
  setModuleLocked: (locked) => set({ moduleLocked: locked }),
  setSuggestedModule: (moduleId) => set({ suggestedModule: moduleId }),
}));
