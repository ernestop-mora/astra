"use client";

import { buildPacket, formatStamp } from "@/lib/packet";
import { useAppStore } from "@/store/useAppStore";

/** What leaves the device for the current consent choice, built from the store. */
export function PacketContent() {
  const consent = useAppStore((s) => s.consent);
  const readings = useAppStore((s) => s.readings);
  const readingsAt = useAppStore((s) => s.readingsAt);
  const crew = useAppStore((s) => s.crew);
  const fault = useAppStore((s) => s.sensorFault);
  const packet = buildPacket(consent, readings, readingsAt, crew, fault);
  const offline = packet.kind === "shared" ? packet.sensors.filter((x) => !x.online) : [];

  return (
    <div aria-live="polite">
      <p className="text-xs text-slate">Simulated data</p>
      {packet.kind === "none" ? (
        <p className="mt-4 text-2xl font-light text-cream">Nothing</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate">To</dt>
            <dd className="text-cream">{packet.recipient}</dd>
            <dt className="text-slate">From</dt>
            <dd className="text-cream">
              {packet.subject ? (
                <>
                  {packet.subject.name} <span className="font-mono text-cream/60">{packet.subject.id}</span>
                </>
              ) : (
                <span className="text-cream/60">No name, no identifier</span>
              )}
            </dd>
            <dt className="text-slate">Taken</dt>
            <dd className="font-mono text-cream">
              {packet.timestamp === null ? "--" : formatStamp(packet.timestamp)}
            </dd>
          </dl>
          <ul className="mt-4 border-t border-rule pt-3 text-sm">
            {packet.rows.map((r) => (
              <li key={r.name} className="flex items-baseline justify-between gap-4 py-1">
                <span className="text-cream/75">{r.name}</span>
                <span>
                  <span className="font-mono text-cream">{r.value}</span>{" "}
                  <span className="text-xs text-slate">{r.unit}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-cream/75">
            {offline.length === 0
              ? "All sensors online"
              : offline.map((x) => `${x.name} offline since ${x.offlineSince === null ? "--" : formatStamp(x.offlineSince)}`).join(", ")}
          </p>
          {packet.label && <p className="mt-4 text-sm text-cyan">{packet.label}</p>}
        </>
      )}
    </div>
  );
}
