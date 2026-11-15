import type { AnchorId } from "@/components/body/anchors";
import { Droplet, Moon, Wind, type LucideIcon } from "lucide-react";
import type { CardId, MetricId, Readings } from "@/lib/triage";

export const MISSION_DAY = 212;
/** Time from page load to EVA start, for the demo countdown. */
export const EVA_OFFSET_MS = (14 * 60 + 23) * 60 * 1000;

export interface CardCopy {
  id: CardId;
  name: string;
  format: (r: Readings) => string;
  unit: string;
  /** Metric whose threshold entry provides the source */
  sourceMetric: MetricId;
  /** Body zone the tag points at */
  anchor: AnchorId;
  /** Tag placement: stage side and vertical position (0 top, 1 bottom) */
  side: "left" | "right";
  v: number;
  measures: string;
  space: string;
  /** Why it matters for tomorrow's EVA */
  eva: string;
}

export const CARDS: readonly CardCopy[] = [
  {
    id: "heart_rate",
    name: "Heart rate",
    format: (r) => r.heart_rate.toFixed(0),
    unit: "bpm",
    sourceMetric: "heart_rate",
    anchor: "heart",
    side: "right",
    v: 0.25,
    measures: "Resting beats per minute.",
    space: "Fluid shifts toward the head and the heart deconditions over months in orbit.",
    eva: "Cardiac reserve for six hours of suited work.",
  },
  {
    id: "blood_pressure",
    name: "Blood pressure",
    format: (r) => `${r.systolic_bp.toFixed(0)}/${r.diastolic_bp.toFixed(0)}`,
    unit: "mmHg",
    sourceMetric: "systolic_bp",
    anchor: "heart",
    side: "right",
    v: 0.36,
    measures: "Arterial pressure, systolic over diastolic.",
    space: "The body sheds plasma volume without gravity, which can bring lightheadedness.",
    eva: "Keeps you steady through suit pressurization.",
  },
  {
    id: "glucose",
    name: "Glucose",
    format: (r) => r.glucose.toFixed(0),
    unit: "mg/dL",
    sourceMetric: "glucose",
    anchor: "abdomen",
    side: "right",
    v: 0.48,
    measures: "Blood sugar, your fuel reserve.",
    space: "Low activity and flight stress hormones shift insulin sensitivity.",
    eva: "The drink bag is your only intake in the suit.",
  },
  {
    id: "temperature",
    name: "Temperature",
    format: (r) => r.body_temperature.toFixed(1),
    unit: "°C",
    sourceMetric: "body_temperature",
    anchor: "torso",
    side: "left",
    v: 0.36,
    measures: "Core body temperature.",
    space: "Without convection heat leaves the body slowly, so crews run warmer.",
    eva: "The cooling garment is tuned to your baseline.",
  },
  {
    id: "sleep",
    name: "Sleep",
    format: (r) => r.sleep_duration.toFixed(1),
    unit: "h",
    sourceMetric: "sleep_duration",
    anchor: "head",
    side: "left",
    v: 0.12,
    measures: "Hours slept last night.",
    space: "Sixteen sunrises a day, noise and CO2 fragment sleep on the station.",
    eva: "Short nights cost fine motor control in pressurized gloves.",
  },
  {
    id: "mood",
    name: "Mood",
    format: (r) => r.mood.toFixed(0),
    unit: "/10",
    sourceMetric: "mood",
    anchor: "head",
    side: "left",
    v: 0.23,
    measures: "Self-reported mood, 1 to 10.",
    space: "Isolation and confinement wear on mood across a long mission.",
    eva: "Focus and clear calls on the loop with Mission Control.",
  },
];

export type ActionId = "lights_out" | "hydrate" | "breathing";

export interface RecoveryAction {
  id: ActionId;
  label: string;
  points: number;
  /** Metrics this action improves */
  affects: readonly CardId[];
  icon: LucideIcon;
}

export const ACTIONS: readonly RecoveryAction[] = [
  { id: "lights_out", label: "Lights out by 21:30", points: 7, affects: ["sleep", "mood"], icon: Moon },
  {
    id: "hydrate",
    label: "Drink 500 ml water",
    points: 4,
    affects: ["blood_pressure", "temperature"],
    icon: Droplet,
  },
  { id: "breathing", label: "10 min paced breathing", points: 4, affects: ["heart_rate", "mood"], icon: Wind },
];
