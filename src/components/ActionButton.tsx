import type { RecoveryAction } from "@/data/home";

interface ActionButtonProps {
  action: RecoveryAction;
  done: boolean;
  onToggle: () => void;
}

export function ActionButton({ action, done, onToggle }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      className={`group flex w-full items-center justify-between gap-6 rounded-lg border px-5 py-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        done ? "border-transparent bg-navy-2" : "border-border hover:bg-navy-2"
      }`}
    >
      <span className={done ? "text-slate line-through decoration-slate/60" : "text-cream"}>
        {action.label}
      </span>
      <span
        className={`shrink-0 font-mono tabular-nums ${done ? "text-cream" : "text-slate group-hover:text-cream"}`}
      >
        +{action.points}
      </span>
    </button>
  );
}
