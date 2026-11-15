"use client";

import { CloudRain, Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";
import { MOODS, type MoodId } from "@/lib/mood";

const ICON: Record<MoodId, LucideIcon> = {
  great: Laugh,
  good: Smile,
  okay: Meh,
  low: Frown,
  very_low: CloudRain,
};

interface MoodSelectorProps {
  value: MoodId | null;
  onSelect: (mood: MoodId) => void;
  /** Row of pills (Capsule header) or a five-cell grid (assistant panel). */
  layout?: "row" | "grid";
}

/**
 * Mood check-in: five options, each with its own icon and word, never colour
 * alone. What is chosen stays in memory on this device.
 */
export function MoodSelector({ value, onSelect, layout = "row" }: MoodSelectorProps) {
  return (
    <div
      role="group"
      aria-label="How are you feeling?"
      data-mood-selector=""
      className={layout === "grid" ? "grid grid-cols-5 gap-2 small:grid-cols-3" : "flex flex-wrap items-center gap-2"}
    >
      {MOODS.map((m) => {
        const Icon = ICON[m.id];
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(m.id)}
            className={`flex cursor-pointer items-center justify-center border border-control text-cream transition-colors duration-150 hover:border-cream aria-pressed:border-cyan aria-pressed:bg-cyan-soft aria-pressed:font-medium ${
              layout === "grid" ? "min-h-14 flex-col gap-1 rounded-field px-1 text-xs" : "h-9 gap-1.5 rounded-pill px-3 text-sm"
            }`}
          >
            <Icon size={layout === "grid" ? 18 : 16} strokeWidth={1.5} aria-hidden="true" className={active ? "text-cyan" : "text-mute"} />
            <span className="whitespace-nowrap">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
