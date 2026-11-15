/**
 * Builds the data packet that leaves the device for a given consent level.
 * Pure: everything comes from app state, nothing is fixed copy.
 *
 * PRIVACY INVARIANT: Time capsule content (folders, files, notes, metadata) never
 * enters a packet and is never offered under any consent option. This module must
 * not import anything from the capsule; ESLint fails the build if it does
 * (eslint.config.mjs, "capsule-stays-on-device").
 */
import type { Crew } from "@/data/baseline";
import { CARDS } from "@/data/home";
import { SENSOR_IDS, SENSORS } from "@/data/sensors";
import type { Readings } from "@/lib/triage";
import type { Consent, SensorFault } from "@/store/useAppStore";

export interface PacketRow {
  name: string;
  value: string;
  unit: string;
}

/** Sensor health: which sensor is offline and since when. */
export interface SensorStatus {
  name: string;
  online: boolean;
  /** Epoch ms the signal was lost; null when online */
  offlineSince: number | null;
}

export function sensorStatus(fault: SensorFault | null): SensorStatus[] {
  return SENSOR_IDS.map((id) => ({
    name: SENSORS[id].name,
    online: fault?.sensor !== id,
    offlineSince: fault?.sensor === id ? fault.since : null,
  }));
}

/**
 * DATA MINIMISATION. What each consent level puts in a packet, and nothing else:
 *
 *   field            private   doctor ("My doctor only")     open ("Open NASA data")
 *   ---------------  --------  ----------------------------  -------------------------
 *   recipient        -         your doctor                   NASA open data
 *   who              -         pseudonymous ID               nothing
 *   name             never     never                         never
 *   crew ID          never     never                         never
 *   time             -         exact, to the second          rounded down to the hour
 *   six readings     -         yes ("No signal" if offline)  yes (offline one left out)
 *   sensor status    -         yes                           no
 *   time capsule     never     never                         never
 *   assistant chat   never     never                         never
 *   actions, score   never     never                         never
 *
 * "private" builds no packet at all. This is a mock-up: no packet is ever
 * transmitted; the panel only shows what would leave the device.
 */
export type Packet =
  | { kind: "none" }
  | {
      kind: "shared";
      level: "doctor" | "open";
      recipient: string;
      /** Stands in for the person; null when the packet carries no identifier at all */
      pseudonym: string | null;
      timestamp: number | null;
      precision: "second" | "hour";
      rows: readonly PacketRow[];
      /** null when sensor status is not part of this level */
      sensors: readonly SensorStatus[] | null;
    };

const HOUR_MS = 3_600_000;

/**
 * A stable code in place of the name and the crew ID. The doctor's side keeps
 * the table that maps it back to a person; the packet does not. In this mock-up
 * it is a plain hash of the simulated crew ID. A real system would use a random
 * or keyed code issued by medical operations.
 */
export function pseudonym(crew: Crew): string {
  let h = 0x811c9dc5;
  for (const ch of crew.id) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return `P-${h.toString(16).padStart(8, "0").slice(0, 6).toUpperCase()}`;
}

export function buildPacket(
  consent: Consent,
  readings: Readings,
  readingsAt: number | null,
  crew: Crew,
  fault: SensorFault | null = null,
): Packet {
  if (consent === "private") return { kind: "none" };

  const offlineCard = fault ? SENSORS[fault.sensor].card : null;

  if (consent === "doctor") {
    return {
      kind: "shared",
      level: "doctor",
      recipient: "Your doctor",
      pseudonym: pseudonym(crew),
      timestamp: readingsAt,
      precision: "second",
      // A metric whose sensor is offline is not sent as a live value.
      rows: CARDS.map((c) => ({
        name: c.name,
        value: c.id === offlineCard ? "No signal" : c.format(readings),
        unit: c.id === offlineCard ? "" : c.unit,
      })),
      sensors: sensorStatus(fault),
    };
  }

  return {
    kind: "shared",
    level: "open",
    recipient: "NASA open data",
    pseudonym: null,
    timestamp: readingsAt === null ? null : Math.floor(readingsAt / HOUR_MS) * HOUR_MS,
    precision: "hour",
    // Readings only. An offline metric is left out, so sensor health is not revealed.
    rows: CARDS.filter((c) => c.id !== offlineCard).map((c) => ({ name: c.name, value: c.format(readings), unit: c.unit })),
    sensors: null,
  };
}

/** Deterministic, locale-free GMT stamp (station time). Hour precision drops minutes and seconds. */
export function formatStamp(ms: number, precision: "second" | "hour" = "second"): string {
  const d = new Date(ms);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  const day = `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (precision === "hour") return `${day}, ${p(d.getUTCHours())}:00 GMT`;
  return `${day}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} GMT`;
}
