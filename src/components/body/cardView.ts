import type { CardCopy } from "@/data/home";
import { lastReadingLabel, SENSORS } from "@/data/sensors";
import { triageCard, type Readings, type Status } from "@/lib/triage";
import type { SensorFault } from "@/store/useAppStore";
import { cardHistory } from "./cardHistory";

export interface CardView {
  status: Status;
  value: string;
  history: { values: number[]; band: [number, number] };
  /** For a card with no signal: "last reading 3 h ago" */
  lastSeen: string | null;
}

/** What a card shows. A card whose sensor has no signal keeps its last value, dimmed. */
export function cardView(card: CardCopy, readings: Readings, fault: SensorFault | null, now: number): CardView {
  const offline = fault !== null && SENSORS[fault.sensor].card === card.id;
  const source = offline ? fault.last : readings;
  return {
    status: triageCard(card.id, readings, offline ? [card.id] : []),
    value: card.format(source),
    history: cardHistory(card, source),
    lastSeen: offline ? lastReadingLabel(fault.since, now) : null,
  };
}
