"use client";

import { useSyncExternalStore } from "react";

/** Same condition as the `fit:` variant in globals.css: the one-screen demo layout. */
const FIT = "(min-width: 80rem) and (min-height: 45rem)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(FIT);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True when the view fits one screen without scrolling. False on the server. */
export function useFit(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(FIT).matches, () => false);
}
