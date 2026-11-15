"use client";

import { Menu } from "@base-ui/react/menu";
import {
  AlertTriangle,
  CircleCheck,
  Hand,
  PackageOpen,
  Play,
  RadioTower,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { DeliveryScene } from "@/components/workshop/DeliveryScene";
import { useDelivery } from "@/components/workshop/useDelivery";
import { ActionRow, Button, GlassPanel, Segmented, StatusDot } from "@/components/ds";
import { DEMO_TIMESTAMP } from "@/data/baseline";
import { lastReadingLabel, PROTOCOL_NOTE, SENSOR_IDS, SENSORS, type SensorId } from "@/data/sensors";
import { DEMO_FAULT_AGE_MS, useFaultNow } from "@/lib/faultClock";
import { eta as etaFor, isProfileId, type ProfileId } from "@/lib/logistics";
import { isDemoUrl } from "@/lib/useDemo";
import { useAppStore } from "@/store/useAppStore";

/* ---------- URL parameters, read once on the client ---------- */

interface Params {
  demo: boolean;
  profile: ProfileId | null;
  still: boolean;
  play: boolean;
}
const SERVER: Params = { demo: false, profile: null, still: false, play: false };
let cached: Params | null = null;
function readParams(): Params {
  if (cached) return cached;
  const q = new URLSearchParams(window.location.search);
  const profile = q.get("profile");
  cached = {
    demo: q.get("demo") === "1",
    profile: isProfileId(profile) ? profile : null,
    still: q.get("still") === "1",
    play: q.get("play") === "1",
  };
  return cached;
}
const noSubscribe = () => () => {};
const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const PROFILES = [
  { value: "iss", label: "ISS" },
  { value: "moon", label: "Moon" },
  { value: "mars", label: "Mars" },
] as const satisfies readonly { value: ProfileId; label: string }[];

function Tag({ tone, children }: { tone: "estimate" | "simulated"; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-pill border px-2.5 py-0.5 text-xs ${
        tone === "estimate" ? "border-cyan-line text-cyan" : "border-slate/50 text-slate"
      }`}
    >
      {children}
    </span>
  );
}

export default function WorkshopPage() {
  const params = useSyncExternalStore(noSubscribe, readParams, () => SERVER);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const fault = useAppStore((s) => s.sensorFault);
  const setSensorFault = useAppStore((s) => s.setSensorFault);
  const now = useFaultNow();
  const [picked, setPicked] = useState<ProfileId | null>(null);
  const profile = picked ?? params.profile ?? "mars";
  const eta = etaFor(profile);
  const delivery = useDelivery({
    flightStart: eta.waitDays / eta.totalDays,
    still: params.still || reduced,
    autoplay: params.play,
    restart: profile,
  });
  const sensor = fault ? SENSORS[fault.sensor] : null;
  const counter = delivery.playing || params.play ? eta.counter(delivery.progress * eta.totalDays) : null;

  const fail = (id: SensorId | null) => {
    if (id === null) return setSensorFault(null);
    // Demo faults use the fixed demo clock; otherwise the store stamps "now".
    setSensorFault(id, isDemoUrl() ? DEMO_TIMESTAMP - DEMO_FAULT_AGE_MS : undefined);
  };

  return (
    // Normal flow only: alert strip, scene, ETA row, glass panels. The main fills the
    // screen and grows (page scroll) on short windows instead of squeezing the scene.
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-6 py-6 lg:px-12">
      {/* 1. Alert strip: the one coral accent on this screen */}
      <section
        aria-label="Sensor status"
        className="surface flex min-h-16 flex-wrap items-center gap-x-6 gap-y-3 rounded-panel py-3 pr-4 pl-5"
      >
        {fault && sensor ? (
          <>
            <AlertTriangle size={22} strokeWidth={1.5} className="shrink-0 text-coral" aria-hidden="true" />
            <p className="flex flex-1 items-baseline gap-3">
              <span className="text-lg text-cream">{sensor.name} offline</span>
              <span className="font-mono text-sm text-slate">{lastReadingLabel(fault.since, now)}</span>
            </p>
          </>
        ) : (
          <p className="flex flex-1 items-center gap-3 text-lg text-cream">
            <StatusDot status="ok" />
            All sensors online
          </p>
        )}
        <Segmented
          aria-label="Destination"
          options={PROFILES}
          value={profile}
          onValueChange={(v) => setPicked(v)}
        />
        <Menu.Root>
          <Menu.Trigger render={<Button variant="quiet" />}>
            <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden="true" />
            Simulate
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end" className="z-50">
              <Menu.Popup className="glass min-w-56 rounded-field p-1 outline-none">
                {SENSOR_IDS.map((id) => (
                  <Menu.Item
                    key={id}
                    onClick={() => fail(id)}
                    className="flex h-9 cursor-pointer items-center justify-between gap-4 rounded-field px-3 text-sm text-cream outline-none select-none data-[highlighted]:bg-cyan-soft"
                  >
                    Fail {SENSORS[id].name.toLowerCase()}
                    {fault?.sensor === id && <StatusDot status="offline" />}
                  </Menu.Item>
                ))}
                <Menu.Item
                  onClick={() => fail(null)}
                  disabled={!fault}
                  className="flex h-9 cursor-pointer items-center rounded-field px-3 text-sm text-cream outline-none select-none data-[disabled]:cursor-default data-[disabled]:text-slate data-[highlighted]:bg-cyan-soft"
                >
                  Clear fault
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </section>

      {/* 2. The scene, full width. Nothing is positioned over the drawing. */}
      <section aria-label="Resupply" className="flex min-h-0 flex-1 flex-col gap-4">
        {/* Takes the free height, never less than 340 px; the SVG scales inside without cropping */}
        <div className="min-h-[340px] flex-1 basis-0">
          <DeliveryScene profile={profile} eta={eta} progress={delivery.progress} counter={counter} />
        </div>

        {/* ETA in its own row below the scene: figure first, then breakdown and labels */}
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-6">
          <div>
            {eta.note && (
              <p className="flex max-w-sm items-start gap-2 text-sm text-amber">
                <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                {eta.note.text}
              </p>
            )}
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="font-mono text-5xl font-light text-cream">{eta.total}</p>
            <p className="mt-2 text-sm text-cream/75">
              {eta.wait}, {eta.flight}
            </p>
            <p className="mt-2 flex flex-wrap justify-center gap-2">
              <Tag tone="estimate">Estimate</Tag>
              <Tag tone="simulated">Simulated</Tag>
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="quiet" onClick={delivery.preview}>
              <Play size={16} strokeWidth={1.5} aria-hidden="true" />
              Preview delivery
            </Button>
          </div>
        </div>
      </section>

      {/* 3. What to do meanwhile */}
      <div className="grid shrink-0 gap-5 lg:h-[320px] lg:grid-cols-3">
        <GlassPanel className="flex flex-col p-5">
          <h2 className="flex items-center gap-2 text-lg font-medium text-cream">
            <Hand size={18} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
            Right now
          </h2>
          {sensor ? (
            <>
              <ul className="mt-4 flex flex-col gap-3">
                {sensor.alternatives.map((a) => (
                  <li key={a} className="flex items-center gap-3 text-cream">
                    <CircleCheck size={16} strokeWidth={1.5} className="shrink-0 text-cyan" aria-hidden="true" />
                    {a}
                  </li>
                ))}
              </ul>
              <p className="mt-auto text-xs text-slate">{PROTOCOL_NOTE}</p>
            </>
          ) : (
            <p className="mt-4 text-cream/75">Every sensor is reporting.</p>
          )}
        </GlassPanel>

        <GlassPanel className="flex flex-col p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-medium text-cream">
              <PackageOpen size={18} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
              Replace it
            </h2>
            {sensor && (
              <span className="text-sm text-amber">
                Spare on board: <span className="font-mono">0 of 1</span>
              </span>
            )}
          </div>
          {sensor && fault ? (
            <Checklist key={fault.sensor} steps={sensor.steps} />
          ) : (
            <p className="mt-4 text-cream/75">Nothing to replace.</p>
          )}
        </GlassPanel>

        <GlassPanel className="flex flex-col p-5">
          <h2 className="flex items-center gap-2 text-lg font-medium text-cream">
            <RadioTower size={18} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
            Ground
          </h2>
          <Ground key={`${profile}-${fault?.sensor ?? "none"}`} replyMinutes={eta.replyMinutes} disabled={!fault} />
        </GlassPanel>
      </div>
    </main>
  );
}

function Checklist({ steps }: { steps: readonly string[] }) {
  const [done, setDone] = useState<readonly number[]>([]);
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {steps.map((step, i) => (
        <li key={step}>
          <ActionRow
            size="sm"
            label={step}
            done={done.includes(i)}
            onDoneChange={(d) => setDone((prev) => (d ? [...prev, i] : prev.filter((x) => x !== i)))}
          />
        </li>
      ))}
    </ul>
  );
}

function Ground({ replyMinutes, disabled }: { replyMinutes: number; disabled: boolean }) {
  const [sent, setSent] = useState(false);
  const reply = replyMinutes <= 1 ? "about a minute" : `about ${replyMinutes} min`;
  return (
    <div className="mt-4 flex flex-1 flex-col">
      {sent ? (
        <div className="mt-auto" role="status">
          <p className="text-cream">
            Report queued. Reply expected in <span className="font-mono">{reply}</span>.
          </p>
          <p className="mt-2">
            <Tag tone="simulated">Simulated</Tag>
          </p>
        </div>
      ) : (
        <Button variant="primary" className="mt-auto self-start" disabled={disabled} onClick={() => setSent(true)}>
          <Send size={16} strokeWidth={1.5} aria-hidden="true" />
          Send report
        </Button>
      )}
    </div>
  );
}
