import { CircleCheck, OctagonAlert, TriangleAlert, WifiOff, type LucideIcon } from "lucide-react";
import { STATUS_COLOR, STATUS_LABEL, type Status } from "@/lib/triage";

const ICON: Record<Status, LucideIcon> = {
  ok: CircleCheck,
  caution: TriangleAlert,
  act: OctagonAlert,
  offline: WifiOff,
};

/**
 * State is never colour alone: each state has its own icon (check, triangle,
 * octagon, no signal) in its colour. Pair it with the word, or use StatusBadge.
 */
export function StatusDot({ status, className = "" }: { status: Status; className?: string }) {
  const Icon = ICON[status];
  return (
    <Icon
      size={14}
      strokeWidth={2}
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      style={{ color: STATUS_COLOR[status] }}
    />
  );
}

/** Icon and word together: "In range", "Caution", "Act now", "No signal". */
export function StatusBadge({ status, className = "" }: { status: Status; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-cream ${className}`}>
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}
