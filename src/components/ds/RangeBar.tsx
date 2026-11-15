import type { Status } from "@/lib/triage";
import { STATUS_COLOR } from "@/lib/triage";

interface RangeBarProps {
  /** Positions on the bar, 0-100 */
  inFrom: number;
  inTo: number;
  at: number;
  /** Label printed on the marker, e.g. "6.1 h" */
  valueLabel: string;
  status: Status;
}

/** 6 px track; the in-range zone in cyan; a vertical marker carrying the value. */
export function RangeBar({ inFrom, inTo, at, valueLabel, status }: RangeBarProps) {
  const edge = at < 12 ? "left" : at > 88 ? "right" : "center";
  return (
    <div className="relative pt-6" role="img" aria-label={`Current ${valueLabel}`}>
      <span
        className={`absolute top-0 font-mono text-xs whitespace-nowrap text-cream ${
          edge === "center" ? "-translate-x-1/2" : edge === "right" ? "-translate-x-full" : ""
        }`}
        style={{ left: `${at}%` }}
      >
        {valueLabel}
      </span>
      <div className="relative h-1.5 rounded-pill bg-cream/10">
        <div className="absolute inset-y-0 rounded-pill bg-cyan/55" style={{ left: `${inFrom}%`, width: `${inTo - inFrom}%` }} />
        <div
          className="absolute -top-1.5 h-[18px] w-0.5 -translate-x-1/2 rounded-pill"
          style={{ left: `${at}%`, background: status === "ok" ? "var(--cream)" : STATUS_COLOR[status] }}
        />
      </div>
    </div>
  );
}
