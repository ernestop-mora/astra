"use client";

import { useEffect, useState } from "react";
import { evaTarget } from "@/lib/evaClock";

/** Whole minutes, rounded up, so a fresh load reads exactly the configured offset. */
function format(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** Time left to tomorrow's spacewalk (EVA). The coral dot is Home's one accent. */
export function EvaCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = evaTarget();
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="flex items-center gap-2 text-cream">
      <span aria-hidden="true" className="size-2 rounded-full bg-coral" />
      <span>
        Spacewalk in{" "}
        <span className="font-mono tabular-nums">
          {remaining === null ? <span className="text-mute">--h --m</span> : format(remaining)}
        </span>
      </span>
    </span>
  );
}
