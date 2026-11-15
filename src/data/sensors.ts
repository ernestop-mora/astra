/**
 * Wearable sensors and what to do when one fails.
 * Alternatives and steps are a SIMULATED protocol: real procedures come from
 * flight surgeons. Every item is six words or fewer.
 */
import type { CardId } from "@/lib/triage";

export const SENSOR_IDS = ["heart", "bp", "glucose", "temp", "sleep"] as const;
export type SensorId = (typeof SENSOR_IDS)[number];

export function isSensorId(v: string | null): v is SensorId {
  return v !== null && (SENSOR_IDS as readonly string[]).includes(v);
}

export interface Sensor {
  name: string;
  /** The metric this sensor feeds */
  card: CardId;
  alternatives: readonly [string, string, string];
  steps: readonly [string, string, string, string, string];
}

export const SENSORS: Record<SensorId, Sensor> = {
  heart: {
    name: "Heart rate patch",
    card: "heart_rate",
    alternatives: ["Count radial pulse for 60 s", "Read pulse from the cuff", "Recount after five minutes rest"],
    steps: ["Peel off the failed patch", "Clean skin over the sternum", "Apply the spare patch firmly", "Pair it with the console", "Confirm the first heart reading"],
  },
  bp: {
    name: "Blood pressure cuff",
    card: "blood_pressure",
    alternatives: ["Manual cuff with stethoscope", "Two readings, one minute apart", "Log arm and posture used"],
    steps: ["Release and remove the cuff", "Check hose and connector", "Fit spare cuff, upper arm", "Pair it with the console", "Confirm a resting reading"],
  },
  glucose: {
    name: "Glucose monitor",
    card: "glucose",
    alternatives: ["Fingerstick glucometer reading", "Test before and after meals", "Log meals and symptoms"],
    steps: ["Remove the failed monitor", "Clean the new site", "Insert the spare sensor", "Wait for warm-up to finish", "Check against a fingerstick"],
  },
  temp: {
    name: "Skin temperature patch",
    card: "temperature",
    alternatives: ["Oral thermometer reading", "Measure morning and evening", "Note cabin temperature too"],
    steps: ["Peel off the failed patch", "Clean and dry the skin", "Apply the spare patch", "Pair it with the console", "Compare with an oral reading"],
  },
  sleep: {
    name: "Sleep band",
    card: "sleep",
    alternatives: ["Keep a written sleep diary", "Note bedtime and wake time", "Rate sleep quality 1 to 10"],
    steps: ["Remove the failed band", "Charge the spare band", "Fit it on the wrist", "Pair it with the console", "Check tonight's sleep record"],
  },
};

export const PROTOCOL_NOTE = "Simulated protocol; real procedures come from flight surgeons";

/** Cards with no signal right now. */
export function offlineCards(fault: { sensor: SensorId } | null): CardId[] {
  return fault ? [SENSORS[fault.sensor].card] : [];
}

/** "last reading 3 h ago" */
export function lastReadingLabel(since: number, now: number): string {
  const min = Math.max(0, Math.round((now - since) / 60000));
  if (min < 1) return "last reading just now";
  if (min < 60) return `last reading ${min} min ago`;
  return `last reading ${Math.round(min / 60)} h ago`;
}
