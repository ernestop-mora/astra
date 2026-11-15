import type { CardCopy } from "@/data/home";
import { history24 } from "@/lib/history";
import { THRESHOLDS, type Readings } from "@/lib/triage";

/** 24-hour series and in-range band for a card's sparkline. */
export function cardHistory(card: CardCopy, readings: Readings): { values: number[]; band: [number, number] } {
  const t = THRESHOLDS[card.sourceMetric];
  return { values: history24(card.sourceMetric, readings[card.sourceMetric]), band: [t.min_green, t.max_green] };
}
