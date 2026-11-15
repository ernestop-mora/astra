import type { Status } from "@/lib/triage";

const SHAPE: Record<Status, string> = {
  /** fixed dot */
  ok: "size-1.5 bg-cyan",
  /** ring that pulses */
  caution: "size-2.5 border-2 border-amber animate-[ring-pulse_2.4s_ease-in-out_infinite]",
  /** filled */
  act: "size-2.5 bg-coral",
  /** dashed ring: no signal */
  offline: "size-2.5 border-[1.5px] border-dashed border-slate",
};

/** State is always colour plus shape: fixed dot, pulsing ring, solid fill, or dashed ring for no signal. */
export function StatusDot({ status, className = "" }: { status: Status; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-grid size-3 shrink-0 place-items-center ${className}`}>
      <span className={`block rounded-full ${SHAPE[status]}`} />
    </span>
  );
}
