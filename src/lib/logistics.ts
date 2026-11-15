/**
 * Resupply estimates from src/data/logistics.json. Deterministic.
 * ETA = wait for the next departure (simulated) + typical flight time (sourced).
 * Every total is an estimate and is labelled as one in the UI.
 */
import data from "@/data/logistics.json";

export const PROFILE_IDS = ["iss", "moon", "mars"] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

export function isProfileId(v: string | null): v is ProfileId {
  return v !== null && (PROFILE_IDS as readonly string[]).includes(v);
}

const DAYS_PER_MONTH = 30.44;
const P = data.profiles;

export interface Tick {
  /** Position along the flight leg, 0-1 */
  at: number;
  label: string;
}

export interface Eta {
  destination: string;
  waitDays: number;
  flightDays: number;
  totalDays: number;
  /** "About 11 months" */
  total: string;
  /** "4 months to launch window" */
  wait: string;
  /** "about 7 in flight" */
  flight: string;
  ticks: Tick[];
  /** Counter shown while the delivery plays: "Month 5" or "Day 12" */
  counter: (elapsedDays: number) => string;
  replyMinutes: number;
  note: { text: string; sourceUrl: string } | null;
  sources: string[];
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

export function eta(id: ProfileId): Eta {
  if (id === "mars") {
    const p = P.mars;
    const waitDays = p.next_departure.months * DAYS_PER_MONTH;
    const flightDays = p.flight.typical_months * DAYS_PER_MONTH;
    const totalMonths = Math.round((waitDays + flightDays) / DAYS_PER_MONTH);
    return {
      destination: p.destination,
      waitDays,
      flightDays,
      totalDays: waitDays + flightDays,
      total: `About ${plural(totalMonths, "month")}`,
      wait: `${plural(p.next_departure.months, "month")} to launch window`,
      flight: `about ${p.flight.typical_months} in flight`,
      ticks: Array.from({ length: p.flight.typical_months - 1 }, (_, i) => ({
        at: (i + 1) / p.flight.typical_months,
        label: i + 2 === p.flight.typical_months ? `${i + 1} mo` : `${i + 1}`,
      })),
      counter: (d) => `Month ${Math.min(totalMonths, Math.floor(d / DAYS_PER_MONTH) + 1)}`,
      replyMinutes: p.ground_reply.minutes,
      note: { text: p.note.text, sourceUrl: p.note.source_url },
      sources: [p.flight.source_url, p.flight.variation_source_url, p.note.source_url],
    };
  }

  const p = P[id];
  const waitDays = p.next_departure.days;
  const flightDays = p.flight.typical_hours / 24;
  const totalDays = Math.round(waitDays + flightDays);
  const weeks = Math.round(waitDays / 7);
  const total = id === "iss" ? `About ${plural(Math.round(totalDays / 7), "week")}` : `About ${totalDays} days`;
  const tickEvery = id === "iss" ? 6 : 24;
  // Stop one step before arrival: the destination marks the end.
  const tickCount = Math.ceil(p.flight.typical_hours / tickEvery) - 1;
  return {
    destination: p.destination,
    waitDays,
    flightDays,
    totalDays: waitDays + flightDays,
    total,
    wait: `${plural(weeks, "week")} to departure`,
    flight: `about ${plural(Math.round(flightDays), "day")} in flight`,
    ticks: Array.from({ length: tickCount }, (_, i) => {
      const value = (i + 1) * tickEvery;
      const last = i + 1 === tickCount;
      return {
        at: value / p.flight.typical_hours,
        label: id === "iss" ? `${value}${last ? " h" : ""}` : `${value / 24}${last ? " d" : ""}`,
      };
    }),
    counter: (d) => `Day ${Math.min(totalDays, Math.floor(d) + 1)}`,
    replyMinutes: p.ground_reply.minutes,
    note: null,
    sources: [p.flight.source_url],
  };
}
