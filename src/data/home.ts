import type { CardId, MetricId, Readings } from "@/lib/triage";

export const MISSION_DAY = 212;
/** Time from page load to EVA start, for the demo countdown. */
export const EVA_OFFSET_MS = (14 * 60 + 23) * 60 * 1000;

export interface CardCopy {
  id: CardId;
  name: string;
  relevance: string;
  format: (r: Readings) => string;
  unit: string;
  /** Metric used for the horizontal bar */
  barMetric: MetricId;
}

export const CARDS: readonly CardCopy[] = [
  {
    id: "heart_rate",
    name: "Heart Rate",
    relevance: "Cardiac reserve for six hours of suited work.",
    format: (r) => r.heart_rate.toFixed(0),
    unit: "bpm",
    barMetric: "heart_rate",
  },
  {
    id: "blood_pressure",
    name: "Blood Pressure",
    relevance: "Keeps you steady through suit pressurization.",
    format: (r) => `${r.systolic_bp.toFixed(0)}/${r.diastolic_bp.toFixed(0)}`,
    unit: "mmHg",
    barMetric: "systolic_bp",
  },
  {
    id: "glucose",
    name: "Glucose",
    relevance: "The drink bag is your only intake in the suit.",
    format: (r) => r.glucose.toFixed(0),
    unit: "mg/dL",
    barMetric: "glucose",
  },
  {
    id: "temperature",
    name: "Temperature",
    relevance: "The cooling garment is tuned to your baseline.",
    format: (r) => r.body_temperature.toFixed(1),
    unit: "°C",
    barMetric: "body_temperature",
  },
  {
    id: "sleep",
    name: "Sleep",
    relevance: "Short nights cost fine motor control in gloves.",
    format: (r) => r.sleep_duration.toFixed(1),
    unit: "h",
    barMetric: "sleep_duration",
  },
  {
    id: "mood",
    name: "Mood",
    relevance: "Focus and clear calls with Mission Control.",
    format: (r) => r.mood.toFixed(0),
    unit: "/10",
    barMetric: "mood",
  },
];

export type ActionId = "lights_out" | "hydrate" | "breathing";

export interface RecoveryAction {
  id: ActionId;
  label: string;
  points: number;
}

export const ACTIONS: readonly RecoveryAction[] = [
  { id: "lights_out", label: "Lights out by 21:30", points: 7 },
  { id: "hydrate", label: "Drink 500 ml before dinner", points: 4 },
  { id: "breathing", label: "10 min paced breathing", points: 4 },
];
