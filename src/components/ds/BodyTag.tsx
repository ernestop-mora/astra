"use client";

import type { ComponentPropsWithRef } from "react";
import { STATUS_COLOR, STATUS_LABEL, type Status } from "@/lib/triage";
import { Sparkline } from "./Sparkline";
import type { ForceState } from "./states";
import { StatusDot } from "./StatusDot";

interface BodyTagProps extends Omit<ComponentPropsWithRef<"button">, "children"> {
  status: Status;
  name: string;
  value: string;
  /** Spoken with the value ("64 bpm"); the tag itself shows the bare value. */
  unit?: string;
  /** Last 24 hours and the in-range band */
  history?: { values: readonly number[]; band: readonly [number, number] };
  /** Small trailing note, e.g. the age of the last reading when there is no signal */
  aside?: string;
  active?: boolean;
  force?: ForceState;
}

/**
 * Capsule: state icon, name, 24-hour sparkline, value. Opens the zone panel.
 * Read out whole: "Heart rate, in range, 64 bpm". Any state other than in range
 * also shows its word under the name. The sparkline steps aside when the tag is
 * too narrow for it (small stage, or enlarged text).
 */
export function BodyTag({ status, name, value, unit, history, aside, active = false, force, className = "", ...props }: BodyTagProps) {
  const offline = status === "offline";
  const spoken = [name, STATUS_LABEL[status].toLowerCase(), offline ? aside : `${value}${unit ? ` ${unit}` : ""}`]
    .filter(Boolean)
    .join(", ");
  return (
    <button
      type="button"
      aria-label={spoken}
      data-force={force}
      data-active={active || undefined}
      className={`surface @container flex min-h-11 items-center gap-2 rounded-pill py-1 pr-3.5 pl-3 text-left transition-[background-color,border-color,opacity,transform] duration-150 select-none [--surface-border:var(--control-border)]
        hover:border-cyan data-[force=hover]:border-cyan
        data-[force=focus]:outline-2 data-[force=focus]:outline-solid data-[force=focus]:outline-offset-2 data-[force=focus]:outline-cyan
        active:scale-[.98] data-[force=pressed]:scale-[.98]
        data-[active]:border-cyan data-[active]:bg-cyan-soft
        disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-control disabled:active:scale-100 ${className}`}
      {...props}
    >
      <StatusDot status={status} />
      <span className="flex min-w-0 flex-1 flex-col text-xs">
        <span className="text-cream">{name}</span>
        {status !== "ok" && <span className="font-medium text-cream">{STATUS_LABEL[status]}</span>}
      </span>
      {history && !offline && (
        <Sparkline values={history.values} band={history.band} stateColor={STATUS_COLOR[status]} width={36} height={16} className="shrink-0 @max-[11.5rem]:hidden" />
      )}
      {aside && <span className="font-mono text-xs whitespace-nowrap text-mute">{aside}</span>}
      <span className={`font-mono text-sm whitespace-nowrap tabular-nums ${offline ? "text-mute line-through" : "text-cream"}`}>
        {value}
      </span>
    </button>
  );
}
