/**
 * ASTRA triage engine. Deterministic, no AI.
 * Every color shown in the UI is derived here from data/thresholds.json.
 */
import thresholdsFile from "@/data/thresholds.json";

export const METRIC_IDS = [
  "heart_rate",
  "systolic_bp",
  "diastolic_bp",
  "glucose",
  "body_temperature",
  "sleep_duration",
  "mood",
] as const;
export type MetricId = (typeof METRIC_IDS)[number];

export const CARD_IDS = [
  "heart_rate",
  "blood_pressure",
  "glucose",
  "temperature",
  "sleep",
  "mood",
] as const;
export type CardId = (typeof CARD_IDS)[number];

export type Status = "green" | "amber" | "red";
export type Readings = Record<MetricId, number>;

export interface Threshold {
  metric: MetricId;
  unit: string;
  min_green: number;
  max_green: number;
  min_amber: number;
  max_amber: number;
  source: string;
  source_url: string;
}

interface ReadinessConfig {
  weights: Record<CardId, number>;
  status_subscore: Record<Status, number>;
  physiological_share: number;
  min_green: number;
  min_amber: number;
}

/** Which raw metrics feed each card. The first one drives the card's bar. */
export const CARD_METRICS: Record<CardId, readonly MetricId[]> = {
  heart_rate: ["heart_rate"],
  blood_pressure: ["systolic_bp", "diastolic_bp"],
  glucose: ["glucose"],
  temperature: ["body_temperature"],
  sleep: ["sleep_duration"],
  mood: ["mood"],
};

function isMetricId(value: string): value is MetricId {
  return (METRIC_IDS as readonly string[]).includes(value);
}

function loadThresholds(): Record<MetricId, Threshold> {
  const out: Partial<Record<MetricId, Threshold>> = {};
  for (const entry of thresholdsFile.metrics) {
    if (!isMetricId(entry.metric)) {
      throw new Error(`thresholds.json: unknown metric "${entry.metric}"`);
    }
    out[entry.metric] = { ...entry, metric: entry.metric };
  }
  for (const id of METRIC_IDS) {
    if (!out[id]) throw new Error(`thresholds.json: missing metric "${id}"`);
  }
  return out as Record<MetricId, Threshold>;
}

export const THRESHOLDS: Record<MetricId, Threshold> = loadThresholds();
const READINESS: ReadinessConfig = thresholdsFile.readiness;

const STATUS_RANK: Record<Status, number> = { green: 0, amber: 1, red: 2 };

export function triageMetric(metric: MetricId, value: number): Status {
  const t = THRESHOLDS[metric];
  if (value >= t.min_green && value <= t.max_green) return "green";
  if (value >= t.min_amber && value <= t.max_amber) return "amber";
  return "red";
}

/** A card takes the worst status of the metrics it combines. */
export function triageCard(card: CardId, readings: Readings): Status {
  return CARD_METRICS[card]
    .map((m) => triageMetric(m, readings[m]))
    .reduce((worst, s) => (STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst), "green" as Status);
}

export interface ScalePosition {
  /** Marker position, 0-100 */
  value: number;
  /** Green band start and end, 0-100 */
  greenFrom: number;
  greenTo: number;
}

/** Position a value on a scale that spans the amber band plus a margin. */
export function scalePosition(metric: MetricId, value: number): ScalePosition {
  const t = THRESHOLDS[metric];
  const margin = (t.max_amber - t.min_amber) * 0.15;
  const lo = t.min_amber - margin;
  const hi = t.max_amber + margin;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  return { value: pct(value), greenFrom: pct(t.min_green), greenTo: pct(t.max_green) };
}

/**
 * Readiness 0-100: weighted physiological subscore, scaled to its share,
 * plus fixed points from completed recovery actions.
 */
export function readinessScore(readings: Readings, actionPoints: number): number {
  let total = 0;
  let weightSum = 0;
  for (const card of CARD_IDS) {
    const w = READINESS.weights[card];
    total += w * READINESS.status_subscore[triageCard(card, readings)];
    weightSum += w;
  }
  const physiological = (total / weightSum) * READINESS.physiological_share;
  return Math.round(Math.min(100, Math.max(0, physiological + actionPoints)));
}

export function readinessStatus(score: number): Status {
  if (score >= READINESS.min_green) return "green";
  if (score >= READINESS.min_amber) return "amber";
  return "red";
}

export const STATUS_COLOR: Record<Status, string> = {
  green: "var(--status-green)",
  amber: "var(--status-amber)",
  red: "var(--status-red)",
};

export const STATUS_LABEL: Record<Status, string> = {
  green: "In range",
  amber: "Caution",
  red: "Alert",
};
