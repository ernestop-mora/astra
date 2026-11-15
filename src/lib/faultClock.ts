"use client";

import { useSyncExternalStore } from "react";
import { DEMO_TIMESTAMP } from "@/data/baseline";
import { isDemoUrl } from "@/lib/useDemo";

const STEP = 30_000;
const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, STEP);
  return () => window.clearInterval(id);
};

/**
 * "Now" for sensor ages. In ?demo=1 it is the fixed demo reading time, so the
 * age label never moves. Otherwise it ticks every 30 s.
 */
export function useFaultNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => (isDemoUrl() ? DEMO_TIMESTAMP : Math.floor(Date.now() / STEP) * STEP),
    () => 0,
  );
}

/** Demo faults start three hours before the fixed demo reading time. */
export const DEMO_FAULT_AGE_MS = 3 * 3600_000;
