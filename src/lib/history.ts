/**
 * 24-point history behind each sparkline (hourly; nightly for sleep and mood).
 * Simulated and deterministic: a daily rhythm plus seeded noise around the
 * current reading, ending exactly at it. Same input, same line, so ?demo=1
 * stays fixed.
 */
import type { MetricId } from "@/lib/triage";

const AMPLITUDE: Record<MetricId, number> = {
  heart_rate: 7,
  systolic_bp: 7,
  diastolic_bp: 5,
  glucose: 14,
  body_temperature: 0.3,
  sleep_duration: 0.8,
  mood: 1,
};

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

export function history24(metric: MetricId, current: number): number[] {
  const rand = seeded(hash(metric));
  const amp = AMPLITUDE[metric];
  const wave = (i: number) => Math.sin((2 * Math.PI * (i + 6)) / 24);
  return Array.from({ length: 24 }, (_, i) =>
    i === 23 ? current : current + amp * 0.6 * (wave(i) - wave(23)) + amp * 0.35 * (rand() * 2 - 1),
  );
}
