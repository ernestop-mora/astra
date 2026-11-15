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
import { useEffect, useState, useSyncExternalStore } from "react";
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
        tone === "estimate" ? "border-cyan text-cyan" : "border-slate text-mute"
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
  // The assistant answers about the profile on screen.
  const setProfile = useAppStore((s) => s.setProfile);
  useEffect(() => setProfile(profile), [profile, setProfile]);
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
    // Normal flow only: alert strip, scene, ETA row, glass panels. On the one-screen
    // layout the scene takes whatever height is left; small windows scroll the page.
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-col gap-4 px-6 pt-6 pb-28 outline-none fit:px-12 fit:py-5">
      <h1 className="sr-only">Workshop</h1>
      {/* 1. Alert strip: the one coral accent on this screen */}
      <section
        aria-label="Sensor status"
        className="surface flex min-h-14 shrink-0 flex-wrap items-center gap-x-6 gap-y-2 rounded-panel py-2 pr-4 pl-5"
      >
        {fault && sensor ? (
          <>
            <AlertTriangle size={22} strokeWidth={1.5} className="shrink-0 text-coral" aria-hidden="true" />
            {/* The one alert on the app: a sensor failure is announced at once. */}
            <p role="alert" className="flex flex-1 flex-wrap items-baseline gap-x-3">
              <span className="text-lg font-medium text-cream">{sensor.name} offline</span>
              <span className="font-mono text-sm text-mute">{lastReadingLabel(fault.since, now)}</span>
            </p>
          </>
        ) : (
          <p role="status" className="flex flex-1 items-center gap-3 text-lg font-medium text-cream">
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
              <Menu.Popup
                style={{ background: "color-mix(in srgb, var(--navy) 92%, transparent)" }}
                className="glass min-w-56 rounded-field p-1 outline-none"
              >
                {SENSOR_IDS.map((id) => (
                  <Menu.Item
                    key={id}
                    onClick={() => fail(id)}
                    className="flex h-9 cursor-pointer items-center justify-between gap-4 rounded-field px-3 text-sm text-cream outline-none select-none data-[highlighted]:bg-cyan-soft data-[highlighted]:outline-2 data-[highlighted]:-outline-offset-2 data-[highlighted]:outline-cyan data-[highlighted]:outline-solid"
                  >
                    Fail {SENSORS[id].name.toLowerCase()}
                    {fault?.sensor === id && <StatusDot status="offline" />}
                  </Menu.Item>
                ))}
                <Menu.Item
                  onClick={() => fail(null)}
                  disabled={!fault}
                  className="flex h-9 cursor-pointer items-center rounded-field px-3 text-sm text-cream outline-none select-none data-[disabled]:cursor-default data-[disabled]:text-mute data-[highlighted]:bg-cyan-soft data-[highlighted]:outline-2 data-[highlighted]:-outline-offset-2 data-[highlighted]:outline-cyan data-[highlighted]:outline-solid"
                >
                  Clear fault
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </section>

      {/* 2. The scene, full width. Nothing is positioned over the drawing. */}
      <section aria-label="Resupply" className="flex flex-1 flex-col gap-3">
        {/* Takes the free height, never less than 11 rem; the SVG scales inside without cropping */}
        <div className="min-h-[11rem] flex-1 basis-0">
          <DeliveryScene profile={profile} eta={eta} progress={delivery.progress} counter={counter} />
        </div>

        {/* ETA in its own row below the scene: figure first, then breakdown and labels */}
        <div className="grid shrink-0 items-center gap-x-6 gap-y-3 md:grid-cols-[1fr_auto_1fr]">
          <div>
            {eta.note && (
              <p className="flex max-w-sm items-start gap-2 text-sm text-cream">
                <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-amber" aria-hidden="true" />
                {eta.note.text}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <p className="font-mono text-figure whitespace-nowrap text-cream">{eta.total}</p>
            <div>
              <p className="text-sm text-mute">
                {eta.wait}, {eta.flight}
              </p>
              <p className="mt-1 flex flex-wrap gap-2">
                <Tag tone="estimate">Estimate</Tag>
                <Tag tone="simulated">Simulated</Tag>
              </p>
            </div>
          </div>
          <div className="flex md:justify-end">
            <Button variant="quiet" onClick={delivery.preview}>
              <Play size={16} strokeWidth={1.5} aria-hidden="true" />
              Preview delivery
            </Button>
          </div>
        </div>
      </section>

      {/* 3. What to do meanwhile */}
      <div className="grid shrink-0 gap-4 fit:grid-cols-3">
        <GlassPanel className="flex flex-col p-4">
          <h2 className="flex items-center gap-2 text-lg font-medium text-cream">
            <Hand size={18} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
            Right now
          </h2>
          {sensor ? (
            <>
              <ul className="mt-3 flex flex-col gap-2">
                {sensor.alternatives.map((a) => (
                  <li key={a} className="flex items-center gap-3 text-sm text-cream">
                    <CircleCheck size={16} strokeWidth={1.5} className="shrink-0 text-cyan" aria-hidden="true" />
                    {a}
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-3 text-xs text-mute">{PROTOCOL_NOTE}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-mute">Every sensor is reporting.</p>
          )}
        </GlassPanel>

        <GlassPanel className="flex flex-col p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="flex items-center gap-2 text-lg font-medium text-cream">
              <PackageOpen size={18} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
              Replace it
            </h2>
            {sensor && (
              <span className="text-sm text-cream">
                Spare on board: <span className="font-mono text-amber">0 of 1</span>
              </span>
            )}
          </div>
          {sensor && fault ? (
            <Checklist key={fault.sensor} steps={sensor.steps} />
          ) : (
            <p className="mt-3 text-sm text-mute">Nothing to replace.</p>
          )}
        </GlassPanel>

        <GlassPanel className="flex flex-col p-4">
          <h2 className="flex items-center gap-2 text-lg font-medium text-cream">
            <RadioTower size={18} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
            Mission control
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
    <ul className="mt-2 flex flex-col gap-1">
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
    <div className="mt-3 flex flex-1 flex-col">
      {sent ? (
        <div className="mt-auto" role="status">
          <p className="text-sm text-cream">
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
