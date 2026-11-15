import { create } from "zustand";
import type { ActionId } from "@/data/home";
import type { Readings } from "@/lib/triage";
import { BASELINE, CREW, type Crew } from "@/data/baseline";
import type { AnchorId } from "@/components/body/anchors";
import type { SensorId } from "@/data/sensors";
import type { ProfileId } from "@/lib/logistics";

/** A sensor with no signal: since when, and what everything read at that moment. */
export interface SensorFault {
  sensor: SensorId;
  since: number;
  last: Readings;
}

export type Consent = "private" | "doctor" | "open";

/** The one side panel: a body zone, or the data packet for the consent choice. */
export type Panel = { kind: "zone"; zone: AnchorId } | { kind: "packet" } | null;

interface AppState {
  readings: Readings;
  /** Epoch ms of the latest reading; null until the simulator mounts. */
  readingsAt: number | null;
  crew: Crew;
  completedActions: readonly ActionId[];
  consent: Consent;
  panel: Panel;
  sensorFault: SensorFault | null;
  /** Active resupply profile in Workshop. */
  profile: ProfileId;
  setProfile: (profile: ProfileId) => void;
  setReadings: (readings: Readings, at: number) => void;
  toggleAction: (id: ActionId) => void;
  setConsent: (consent: Consent) => void;
  openPanel: (panel: Exclude<Panel, null>) => void;
  closePanel: () => void;
  /** Fails one sensor (or clears with null). `since` defaults to now. */
  setSensorFault: (sensor: SensorId | null, since?: number) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  readings: BASELINE,
  readingsAt: null,
  crew: CREW,
  completedActions: [],
  consent: "private",
  panel: null,
  sensorFault: null,
  profile: "mars",
  setProfile: (profile) => set({ profile }),
  setReadings: (readings, at) => set({ readings, readingsAt: at }),
  toggleAction: (id) =>
    set((s) => ({
      completedActions: s.completedActions.includes(id)
        ? s.completedActions.filter((a) => a !== id)
        : [...s.completedActions, id],
    })),
  setConsent: (consent) => set({ consent }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
  setSensorFault: (sensor, since) =>
    set((s) => ({
      sensorFault: sensor === null ? null : { sensor, since: since ?? Date.now(), last: s.readings },
    })),
}));
