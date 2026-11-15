"use client";

import { useEffect, useState } from "react";

const LOAD_MS = 2400;
const PREVIEW_MS = 6000;
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

interface Options {
  /** Where the flight leg starts on the 0-1 timeline (after the wait) */
  flightStart: number;
  /** ?still=1 or reduced motion: no animation, final state */
  still: boolean;
  /** ?play=1: play the whole trip on load */
  autoplay: boolean;
  /** Restart key, e.g. the profile */
  restart: string;
}

/**
 * Timeline progress for the scene. On load the ship flies its leg in 2.4 s
 * (ease-out). preview() plays the whole trip, wait included, in 6 s.
 * All state changes happen inside animation frames.
 */
export function useDelivery({ flightStart, still, autoplay, restart }: Options) {
  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState<{ mode: "load" | "preview"; n: number }>({ mode: "load", n: 0 });

  useEffect(() => {
    let raf = 0;
    if (still) {
      raf = requestAnimationFrame(() => {
        setProgress(1);
        setPlaying(false);
      });
      return () => cancelAnimationFrame(raf);
    }
    // ?play=1 is known only after hydration, so the first run checks it here.
    const preview = run.mode === "preview" || (autoplay && run.n === 0);
    const from = preview ? 0 : flightStart;
    const duration = preview ? PREVIEW_MS : LOAD_MS;
    let start = 0;
    const frame = (time: number) => {
      if (!start) start = time;
      const k = Math.min(1, (time - start) / duration);
      setProgress(from + (1 - from) * (preview ? k : easeOut(k)));
      setPlaying(preview && k < 1);
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [run, still, autoplay, flightStart, restart]);

  return {
    progress,
    playing,
    preview: () => setRun((r) => ({ mode: "preview", n: r.n + 1 })),
  };
}
