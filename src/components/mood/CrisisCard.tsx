"use client";

import { LifeBuoy, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import { MOOD_CRISIS } from "@/lib/assistant/answers";

/**
 * Fixed support card for a crisis phrase. No video, no motion, no advice: it
 * points to people. Both actions are simulated in this mock-up and say so.
 * This mock-up is not a mental health service.
 */
export function CrisisCard({ compact = false }: { compact?: boolean }) {
  const [pressed, setPressed] = useState<string | null>(null);
  const actions = [
    { id: "surgeon", label: "Call crew surgeon", icon: Phone },
    { id: "mcc", label: "Message Mission control", icon: MessageSquare },
  ] as const;

  return (
    <section
      aria-labelledby="crisis-title"
      data-crisis-card=""
      className={`surface-light rounded-panel ${compact ? "p-4" : "w-full max-w-xl p-6"}`}
    >
      <div className="flex items-start gap-3">
        <LifeBuoy size={compact ? 20 : 24} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
        <h2 id="crisis-title" className={`${compact ? "text-md" : "text-lg"} font-medium`}>
          {MOOD_CRISIS}
        </h2>
      </div>
      <div className={`mt-4 flex gap-2 ${compact ? "flex-col" : "flex-wrap"}`}>
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setPressed(a.label)}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill border border-navy bg-navy px-4 text-sm font-medium text-cream transition-colors duration-150 hover:bg-navy-3"
          >
            <a.icon size={16} strokeWidth={1.5} aria-hidden="true" />
            {a.label}
            <span className="rounded-pill border border-cream/50 px-2 text-xs font-normal">Simulated</span>
          </button>
        ))}
      </div>
      <p role="status" className="mt-3 min-h-[1.5em] text-sm">
        {pressed ? `${pressed} is simulated in this mock-up. Please reach a real person now.` : ""}
      </p>
      <p className="text-xs">This mock-up is not a mental health service.</p>
    </section>
  );
}
