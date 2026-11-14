import { readinessStatus, STATUS_COLOR } from "@/lib/triage";

interface ScoreCircleProps {
  score: number;
  size?: number;
}

const STROKE = 6;

export function ScoreCircle({ score, size = 200 }: ScoreCircleProps) {
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const color = STATUS_COLOR[readinessStatus(score)];

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label="Readiness score"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--navy-3)"
          strokeWidth={STROKE}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-6xl font-light tabular-nums text-cream">{score}</span>
        <span className="mt-1 text-xs font-light uppercase tracking-[0.2em] text-slate">
          readiness
        </span>
      </div>
    </div>
  );
}
