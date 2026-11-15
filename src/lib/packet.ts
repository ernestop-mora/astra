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

export type Packet =
  | { kind: "none" }
  | {
      kind: "shared";
      recipient: string;
      /** null when the packet is anonymized */
      subject: Crew | null;
      label: string | null;
      timestamp: number | null;
      rows: readonly PacketRow[];
      sensors: readonly SensorStatus[];
    };

export function buildPacket(
  consent: Consent,
  readings: Readings,
  readingsAt: number | null,
  crew: Crew,
  fault: SensorFault | null = null,
): Packet {
  if (consent === "private") return { kind: "none" };

  // A metric whose sensor is offline is not sent as a live value.
  const offlineCard = fault ? SENSORS[fault.sensor].card : null;
  const rows = CARDS.map((c) => ({
    name: c.name,
    value: c.id === offlineCard ? "No signal" : c.format(readings),
    unit: c.id === offlineCard ? "" : c.unit,
  }));
  const sensors = sensorStatus(fault);

  if (consent === "doctor") {
    return {
      kind: "shared",
      recipient: "Flight surgeon",
      subject: crew,
      label: null,
      timestamp: readingsAt,
      rows,
      sensors,
    };
  }

  return {
    kind: "shared",
    recipient: "NASA open data",
    subject: null,
    label: "Anonymized, usable for research and education",
    timestamp: readingsAt,
    rows,
    sensors,
  };
}

/** Deterministic, locale-free GMT stamp (station time). */
export function formatStamp(ms: number): string {
  const d = new Date(ms);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} GMT`;
}
