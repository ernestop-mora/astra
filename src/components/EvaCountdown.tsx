"use client";

import { useEffect, useState } from "react";
import { EVA_OFFSET_MS } from "@/data/home";

/** Whole minutes, rounded up, so a fresh load reads exactly the configured offset. */
function format(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export function EvaCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = Date.now() + EVA_OFFSET_MS;
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-cream">
      EVA in{" "}
      <span className="font-mono tabular-nums text-coral">
        {remaining === null ? <span className="text-slate">--h --m</span> : format(remaining)}
      </span>
    </span>
  );
}
