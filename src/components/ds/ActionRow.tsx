"use client";

import { Toggle } from "@base-ui/react/toggle";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import type { ForceState } from "./states";

interface ActionRowProps {
  /** Four words at most. */
  label: string;
  /** Readiness points; omitted for plain checklist steps */
  points?: number;
  /** sm: compact 36 px row for checklists and panels */
  size?: "md" | "sm";
  done: boolean;
  onDoneChange: (done: boolean) => void;
  icon?: LucideIcon;
  /** Cream surface with navy text: the one action with the most impact. */
  featured?: boolean;
  disabled?: boolean;
  force?: ForceState;
  className?: string;
}

/** Action row: a mark ring that draws in 250 ms, an icon, a short label, points in mono. */
export function ActionRow({
  label,
  points,
  done,
  onDoneChange,
  icon: Icon,
  size = "md",
  featured = false,
  disabled,
  force,
  className = "",
}: ActionRowProps) {
  const ink = featured ? "var(--navy)" : "var(--cyan)";
  return (
    <Toggle
      pressed={done}
      onPressedChange={(pressed) => onDoneChange(pressed)}
      disabled={disabled}
      data-force={force}
      className={`flex ${size === "sm" ? "min-h-9 gap-3 py-1 text-sm" : "min-h-12 gap-4 py-2"} w-full cursor-pointer items-center rounded-field px-4 text-left transition-[background-color,border-color,transform] duration-150 select-none
        ${featured ? "surface-light font-medium focus-visible:outline-cyan" : "surface text-cream [--surface-border:var(--control-border)] hover:border-cyan data-[force=hover]:border-cyan data-[pressed]:border-cyan"}
        data-[force=focus]:outline-2 data-[force=focus]:outline-solid data-[force=focus]:outline-offset-2 data-[force=focus]:outline-cyan
        active:scale-[.98] data-[force=pressed]:scale-[.98]
        data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[disabled]:active:scale-100 ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0 -rotate-90">
        <circle cx="10" cy="10" r="8" fill="none" stroke={featured ? "var(--navy)" : "var(--cream)"} strokeOpacity={featured ? 0.7 : 0.5} strokeWidth="1.5" />
        <motion.circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={ink}
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
        <motion.circle
          cx="10"
          cy="10"
          r="3"
          fill={ink}
          initial={false}
          animate={{ scale: done ? 1 : 0 }}
          transition={{ duration: 0.15, delay: done ? 0.2 : 0 }}
        />
      </svg>
      {Icon && (
        <Icon
          size={18}
          strokeWidth={1.5}
          aria-hidden="true"
          className={`shrink-0 ${featured ? "text-navy" : "text-cyan"}`}
        />
      )}
      <span className="flex-1">{label}</span>
      {points !== undefined && (
        <span
          className={`font-mono text-md tabular-nums ${featured ? "text-navy" : done ? "text-cyan" : "text-mute"}`}
        >
          +{points}
        </span>
      )}
    </Toggle>
  );
}
