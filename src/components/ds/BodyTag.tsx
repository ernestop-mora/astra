"use client";

import type { ComponentPropsWithRef } from "react";
import { STATUS_COLOR, type Status } from "@/lib/triage";
import { Sparkline } from "./Sparkline";
import type { ForceState } from "./states";
import { StatusDot } from "./StatusDot";

interface BodyTagProps extends Omit<ComponentPropsWithRef<"button">, "children"> {
  status: Status;
  name: string;
  value: string;
  unit?: string;
  /** Last 24 hours and the in-range band */
  history?: { values: readonly number[]; band: readonly [number, number] };
  /** Small trailing note, e.g. the age of the last reading when there is no signal */
  aside?: string;
  active?: boolean;
  force?: ForceState;
}

/** Capsule: status dot, name, 24-hour sparkline, value. Opens the zone panel. */
export function BodyTag({ status, name, value, unit, history, aside, active = false, force, className = "", ...props }: BodyTagProps) {
  const offline = status === "offline";
  return (
    <button
      type="button"
      data-force={force}
      data-active={active || undefined}
      className={`surface flex h-11 items-center gap-2.5 rounded-pill pr-4 pl-3 text-left outline-none transition-[background-color,border-color,opacity,transform] duration-150 select-none
        hover:border-cyan/40 data-[force=hover]:border-cyan/40
        focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cyan data-[force=focus]:outline-2 data-[force=focus]:outline-solid data-[force=focus]:outline-offset-2 data-[force=focus]:outline-cyan
        active:scale-[.98] data-[force=pressed]:scale-[.98]
        data-[active]:border-cyan-line data-[active]:bg-cyan-soft
        disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-rule disabled:active:scale-100 ${className}`}
      {...props}
    >
      <StatusDot status={status} />
      <span className="min-w-0 flex-1 truncate text-xs text-cream/75">{name}</span>
      {history && !offline && (
        <Sparkline values={history.values} band={history.band} stateColor={STATUS_COLOR[status]} width={44} height={16} className="shrink-0" />
      )}
      {aside && <span className="font-mono text-xs whitespace-nowrap text-slate">{aside}</span>}
      <span className={`font-mono text-sm tabular-nums ${offline ? "text-slate line-through decoration-slate/50" : "text-cream"}`}>
        {value}
        {unit && <span className="ml-1 text-xs text-slate">{unit}</span>}
      </span>
    </button>
  );
}
