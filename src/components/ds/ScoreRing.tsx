"use client";

import { readinessStatus, STATUS_COLOR, STATUS_LABEL } from "@/lib/triage";
import { StatusDot } from "./StatusDot";

interface ScoreRingProps {
  score: number;
  /** Uncertainty when a sensor is offline: drawn as a translucent band */
  range?: { low: number; high: number } | null;
  /** Largest size in px; the ring shrinks with its container. */
  size?: number;
  className?: string;
}

const SEGMENTS = 40;
const GAP_DEG = 2.2;
const TICKS = 20;

function polar(c: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
}

function arc(c: number, r: number, from: number, to: number): string {
  const [x1, y1] = polar(c, r, from);
  const [x2, y2] = polar(c, r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/**
 * Readiness 0-100 as a segmented arc with graduation marks.
 * Cyan from 80, amber 60-79, coral below 60.
 */
export function ScoreRing({ score, range = null, size = 240, className = "" }: ScoreRingProps) {
  const c = size / 2;
  const r = c - 22;
  const lit = Math.round((score / 100) * SEGMENTS);
  const bandFrom = range ? Math.round((range.low / 100) * SEGMENTS) : lit;
  const bandTo = range ? Math.round((range.high / 100) * SEGMENTS) : lit;
  const solid = range ? bandFrom : lit;
  const status = readinessStatus(score);
  const color = STATUS_COLOR[status];
  const step = 360 / SEGMENTS;

  return (
    <div
      className={`relative aspect-square shrink-0 ${className}`}
      style={{ width: size, maxWidth: "100%" }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label="Readiness"
      aria-valuetext={`${score} of 100, ${STATUS_LABEL[status].toLowerCase()}${range ? `, estimate between ${range.low} and ${range.high}` : ""}`}
    >
      <svg className="h-full w-full" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {Array.from({ length: TICKS }, (_, i) => {
          const major = i % 5 === 0;
          const [x1, y1] = polar(c, c - 4, (i * 360) / TICKS);
          const [x2, y2] = polar(c, c - (major ? 12 : 8), (i * 360) / TICKS);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--slate)" strokeWidth={major ? 1.5 : 1} />;
        })}
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <path
            key={i}
            d={arc(c, r, i * step + GAP_DEG / 2, (i + 1) * step - GAP_DEG / 2)}
            fill="none"
            stroke={i < solid || (i >= bandFrom && i < bandTo) ? color : "var(--navy-3)"}
            strokeOpacity={i >= solid && i < bandTo ? 0.35 : 1}
            strokeWidth={10}
            style={{ transition: `stroke 300ms ease ${i * 8}ms` }}
          />
        ))}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-figure tabular-nums text-cream">{score}</span>
        {/* The level is an icon as well as the arc's colour. */}
        <span className="flex items-center gap-1.5 text-xs text-mute">
          <StatusDot status={status} />
          {range ? `${range.low}-${range.high} estimate` : "readiness"}
        </span>
      </span>
    </div>
  );
}
