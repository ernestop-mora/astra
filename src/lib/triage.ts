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

/** ok = in range (cyan), caution (amber), act = act now (coral). */
export type Reading = "ok" | "caution" | "act";
/** offline = the sensor has no signal (dashed slate ring). Not a reading state. */
export type Status = Reading | "offline";
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
  status_subscore: Record<Reading, number>;
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

export const STATUS_RANK: Record<Status, number> = { ok: 0, caution: 1, act: 2, offline: 3 };

export function triageMetric(metric: MetricId, value: number): Reading {
  const t = THRESHOLDS[metric];
  if (value >= t.min_green && value <= t.max_green) return "ok";
  if (value >= t.min_amber && value <= t.max_amber) return "caution";
  return "act";
}

/** A card from its readings only: the worst status of the metrics it combines. */
function readingStatus(card: CardId, readings: Readings): Reading {
  return CARD_METRICS[card]
    .map((m) => triageMetric(m, readings[m]))
    .reduce((worst, s) => (STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst), "ok" as Reading);
}

/** A card's status; a card whose sensor has no signal is "offline", whatever it last read. */
export function triageCard(card: CardId, readings: Readings, offline: readonly CardId[] = []): Status {
  return offline.includes(card) ? "offline" : readingStatus(card, readings);
}

export interface ScalePosition {
  /** Marker position, 0-100 */
  value: number;
  /** Green band start and end, 0-100 */
  greenFrom: number;
  greenTo: number;
  /** Amber band start and end, 0-100 */
  amberFrom: number;
  amberTo: number;
}

/** Position a value on a scale that spans the amber band plus a margin. */
export function scalePosition(metric: MetricId, value: number): ScalePosition {
  const t = THRESHOLDS[metric];
  const margin = (t.max_amber - t.min_amber) * 0.15;
  const lo = t.min_amber - margin;
  const hi = t.max_amber + margin;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  return {
    value: pct(value),
    greenFrom: pct(t.min_green),
    greenTo: pct(t.max_green),
    amberFrom: pct(t.min_amber),
    amberTo: pct(t.max_amber),
  };
}

/** Weighted readiness; `assume` overrides the status of the given cards. */
function score(readings: Readings, actionPoints: number, skip: readonly CardId[], assume?: Reading): number {
  let total = 0;
  let weightSum = 0;
  for (const card of CARD_IDS) {
    const skipped = skip.includes(card);
    if (skipped && !assume) continue;
    const w = READINESS.weights[card];
    const status = skipped && assume ? assume : readingStatus(card, readings);
    total += w * READINESS.status_subscore[status];
    weightSum += w;
  }
  const physiological = (total / weightSum) * READINESS.physiological_share;
  return Math.round(Math.min(100, Math.max(0, physiological + actionPoints)));
}

/**
 * Readiness 0-100: weighted physiological subscore, scaled to its share,
 * plus fixed points from completed recovery actions. Cards with no signal are
 * left out and the remaining weights are redistributed.
 */
export function readinessScore(readings: Readings, actionPoints: number, offline: readonly CardId[] = []): number {
  return score(readings, actionPoints, offline);
}

/**
 * Uncertainty from missing sensors: the score if every offline card were in
 * range (high) or needed action (low). Null when every sensor reports.
 */
export function readinessRange(
  readings: Readings,
  actionPoints: number,
  offline: readonly CardId[],
): { low: number; high: number } | null {
  if (offline.length === 0) return null;
  return {
    low: score(readings, actionPoints, offline, "act"),
    high: score(readings, actionPoints, offline, "ok"),
  };
}

export function readinessStatus(score: number): Reading {
  if (score >= READINESS.min_green) return "ok";
  if (score >= READINESS.min_amber) return "caution";
  return "act";
}

export const STATUS_COLOR: Record<Status, string> = {
  ok: "var(--state-ok)",
  caution: "var(--state-caution)",
  act: "var(--state-act)",
  offline: "var(--slate-text)",
};

export const STATUS_LABEL: Record<Status, string> = {
  ok: "In range",
  caution: "Caution",
  act: "Act now",
  offline: "No signal",
};
