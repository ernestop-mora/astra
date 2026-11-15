"use client";

import { useEffect } from "react";
import { METRIC_IDS, type MetricId, type Readings } from "@/lib/triage";
import { useAppStore } from "@/store/useAppStore";
import { BASELINE, DEMO_TIMESTAMP } from "@/data/baseline";

export const TICK_MS = 5000;

/**
 * Max relative variation per tick. 3% by default.
 * Temperature uses 0.4%: 3% of 36.8 °C would swing over 1 °C every 5 s.
 * Sleep and mood are once-a-day measurements, so they do not drift.
 */
const VARIATION: Record<MetricId, number> = {
  heart_rate: 0.03,
  systolic_bp: 0.03,
  diastolic_bp: 0.03,
  glucose: 0.03,
  body_temperature: 0.004,
  sleep_duration: 0,
  mood: 0,
};

const DECIMALS: Record<MetricId, number> = {
  heart_rate: 0,
  systolic_bp: 0,
  diastolic_bp: 0,
  glucose: 0,
  body_temperature: 1,
  sleep_duration: 1,
  mood: 0,
};

export function nextReadings(random: () => number = Math.random): Readings {
  const out = { ...BASELINE };
  for (const id of METRIC_IDS) {
    const factor = 1 + (random() * 2 - 1) * VARIATION[id];
    const p = 10 ** DECIMALS[id];
    out[id] = Math.round(BASELINE[id] * factor * p) / p;
  }
  return out;
}

export function useSimulator(): void {
  const setReadings = useAppStore((s) => s.setReadings);
  useEffect(() => {
    // ?demo=1 freezes readings and their timestamp at the baseline, for recordings.
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      setReadings(BASELINE, DEMO_TIMESTAMP);
      return;
    }
    setReadings(BASELINE, Date.now());
    const id = setInterval(() => setReadings(nextReadings(), Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [setReadings]);
}
