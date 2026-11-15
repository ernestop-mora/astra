"use client";

import { Check } from "lucide-react";
import { buildPacket, formatStamp } from "@/lib/packet";
import { useAppStore, type Consent } from "@/store/useAppStore";

/** One plain rule per consent level. They describe exactly what src/lib/packet.ts builds. */
const RULES: readonly { level: Consent; name: string; rule: string }[] = [
  { level: "private", name: "Private", rule: "Nothing is sent." },
  { level: "doctor", name: "My doctor only", rule: "Readings, sensor status and a coded ID. No name." },
  { level: "open", name: "Open NASA data", rule: "Readings only. No ID. Time rounded to the hour." },
];

/** Privacy panel: the notice, the rule for each level, and what would leave right now. */
export function PacketContent() {
  const consent = useAppStore((s) => s.consent);
  const readings = useAppStore((s) => s.readings);
  const readingsAt = useAppStore((s) => s.readingsAt);
  const crew = useAppStore((s) => s.crew);
  const fault = useAppStore((s) => s.sensorFault);
  const packet = buildPacket(consent, readings, readingsAt, crew, fault);
  const offline = packet.kind === "shared" && packet.sensors ? packet.sensors.filter((x) => !x.online) : [];

  return (
    <>
      <p className="text-sm text-cream">Demo data is simulated. Nothing leaves your device unless you choose.</p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {RULES.map((r) => {
          const current = r.level === consent;
          return (
            <li
              key={r.level}
              aria-current={current ? "true" : undefined}
              className={`flex items-start gap-2 rounded-field border px-3 py-1.5 text-sm ${current ? "border-cyan bg-cyan-soft" : "border-rule"}`}
            >
              <Check size={16} strokeWidth={2} aria-hidden="true" className={`mt-0.5 shrink-0 text-cyan ${current ? "" : "invisible"}`} />
              <span>
                <span className="font-medium text-cream">{r.name}</span>
                {current && <span className="sr-only"> (your choice)</span>}
                <span className="block text-mute">{r.rule}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="packet-now" aria-live="polite" className="mt-3 border-t border-rule pt-3">
        <h3 id="packet-now" className="text-xs text-mute">
          Leaving this device now
        </h3>
        {packet.kind === "none" ? (
          <p className="mt-1 text-lg font-medium text-cream">Nothing</p>
        ) : (
          <>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 text-sm">
              <dt className="text-mute">To</dt>
              <dd className="text-cream">{packet.recipient}</dd>
              <dt className="text-mute">From</dt>
              <dd className="text-cream">
                {packet.pseudonym ? (
                  <>
                    Coded ID <span className="font-mono">{packet.pseudonym}</span>
                  </>
                ) : (
                  "No name, no ID"
                )}
              </dd>
              <dt className="text-mute">Taken</dt>
              <dd className="font-mono text-cream">
                {packet.timestamp === null ? "Waiting for a reading" : formatStamp(packet.timestamp, packet.precision)}
              </dd>
            </dl>
            <ul className="mt-2 border-t border-rule pt-2 text-sm">
              {packet.rows.map((r) => (
                <li key={r.name} className="flex items-baseline justify-between gap-4">
                  <span className="text-mute">{r.name}</span>
                  <span>
                    <span className="font-mono text-cream">{r.value}</span> <span className="text-xs text-mute">{r.unit}</span>
                  </span>
                </li>
              ))}
            </ul>
            {packet.sensors && (
              <p className="mt-2 text-sm text-mute">
                {offline.length === 0
                  ? "All sensors online"
                  : offline
                      .map((x) => `${x.name} offline since ${x.offlineSince === null ? "unknown" : formatStamp(x.offlineSince)}`)
                      .join(", ")}
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
