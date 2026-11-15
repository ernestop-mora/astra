import type { Readings } from "@/lib/triage";

/** Crew member baseline. Sleep sits in caution on purpose: it drives today's story. */
export const BASELINE: Readings = {
  heart_rate: 64,
  systolic_bp: 114,
  diastolic_bp: 74,
  glucose: 94,
  body_temperature: 36.8,
  sleep_duration: 6.1,
  mood: 7,
};

/** Simulated crew identity. Attached to identified packets only. */
export interface Crew {
  name: string;
  id: string;
}

export const CREW: Crew = { name: "A. Rivera", id: "ASTRA-CM-04" };

/** Fixed reading time for ?demo=1, so recordings are identical. */
export const DEMO_TIMESTAMP = Date.UTC(2026, 10, 14, 6, 0, 0);
