"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** True when the page was opened with ?demo=1. Always false on the server. */
export function isDemoUrl(): boolean {
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

export function useDemo(): boolean {
  return useSyncExternalStore(noSubscribe, isDemoUrl, () => false);
}

/** Keeps ?demo=1 when linking between tabs. */
export function withDemo(href: string, demo: boolean): string {
  return demo ? `${href}?demo=1` : href;
}
