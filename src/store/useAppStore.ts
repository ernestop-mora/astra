import { create } from "zustand";
import type { ActionId } from "@/data/home";
import type { Readings } from "@/lib/triage";
import { BASELINE } from "@/data/baseline";

export type Consent = "private" | "doctor" | "open";

interface AppState {
  readings: Readings;
  completedActions: readonly ActionId[];
  consent: Consent;
  setReadings: (readings: Readings) => void;
  toggleAction: (id: ActionId) => void;
  setConsent: (consent: Consent) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  readings: BASELINE,
  completedActions: [],
  consent: "private",
  setReadings: (readings) => set({ readings }),
  toggleAction: (id) =>
    set((s) => ({
      completedActions: s.completedActions.includes(id)
        ? s.completedActions.filter((a) => a !== id)
        : [...s.completedActions, id],
    })),
  setConsent: (consent) => set({ consent }),
}));
