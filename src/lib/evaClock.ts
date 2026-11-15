import { EVA_OFFSET_MS } from "@/data/home";

let target: number | null = null;

/** EVA start, fixed once per page load so every reader counts down to the same instant. */
export function evaTarget(): number {
  if (target === null) target = Date.now() + EVA_OFFSET_MS;
  return target;
}
