"use client";

import {
  Activity,
  Archive,
  AudioLines,
  Droplet,
  HeartPulse,
  House,
  Image as ImageIcon,
  Moon,
  StickyNote,
  Thermometer,
  Video,
  Wind,
} from "lucide-react";
import { useState } from "react";
import {
  ActionRow,
  BodyTag,
  Button,
  GlassPanel,
  RangeBar,
  ScoreRing,
  Segmented,
  Sparkline,
  StatusDot,
  type ForceState,
} from "@/components/ds";
import { history24 } from "@/lib/history";
import type { Status } from "@/lib/triage";

type Shown = "rest" | ForceState | "disabled";
const STATES: readonly Shown[] = ["rest", "hover", "focus", "pressed", "disabled"];
const force = (s: Shown): ForceState | undefined => (s === "rest" || s === "disabled" ? undefined : s);

const HR = history24("heart_rate", 64);
const SLEEP = history24("sleep_duration", 6.1);
const ICONS = [House, Archive, HeartPulse, Activity, Thermometer, Droplet, Moon, Wind, Video, ImageIcon, AudioLines, StickyNote];

/** Every colour, its fixed role, and one example of that use. */
const PALETTE: readonly { name: string; hex: string; value: string; role: string; example: React.ReactNode }[] = [
  {
    name: "navy",
    hex: "#172A39",
    value: "var(--navy)",
    role: "Stage and base background",
    example: <span className="block h-10 rounded-field border border-rule bg-navy" />,
  },
  {
    name: "navy-2",
    hex: "#20384A",
    value: "var(--navy-2)",
    role: "Depth layer: surfaces",
    example: (
      <span className="block rounded-field bg-navy-2 p-2">
        <span className="block h-6 rounded-field bg-navy-3" />
      </span>
    ),
  },
  {
    name: "navy-3",
    hex: "#2A4659",
    value: "var(--navy-3)",
    role: "Depth layer: cards and panels",
    example: <span className="surface block h-10 rounded-field" />,
  },
  {
    name: "cream",
    hex: "#E9E4E0",
    value: "var(--cream)",
    role: "Main text and light surfaces",
    example: (
      <span className="surface-light flex h-10 items-center rounded-field px-3 text-sm">Featured card</span>
    ),
  },
  {
    name: "slate",
    hex: "#6E7575",
    value: "var(--slate)",
    role: "Secondary text, lines, inactive",
    example: (
      <span className="flex h-10 flex-col justify-center gap-1.5 text-xs text-slate">
        Secondary label
        <span className="block h-px bg-slate/50" />
      </span>
    ),
  },
  {
    name: "cyan",
    hex: "#62D4E6",
    value: "var(--cyan)",
    role: "Data, interaction and signal",
    example: <Sparkline values={HR} band={[50, 90]} stateColor="var(--cyan)" width="100%" height={40} className="block" />,
  },
  {
    name: "amber",
    hex: "#E8A838",
    value: "var(--amber)",
    role: "Caution state",
    example: (
      <span className="flex h-10 items-center gap-2 text-sm text-amber">
        <StatusDot status="caution" /> Caution
      </span>
    ),
  },
  {
    name: "coral",
    hex: "#FC563C",
    value: "var(--coral)",
    role: "Alert, new or unseen, one emphasis per screen",
    example: (
      <span className="flex h-10 items-center gap-3 text-sm text-cream">
        <span className="size-2.5 rounded-full bg-coral" /> New
        <span className="font-mono text-coral">14h 23m</span>
      </span>
    ),
  },
];

const STATUSES: readonly { status: Status; label: string }[] = [
  { status: "ok", label: "In range" },
  { status: "caution", label: "Caution" },
  { status: "act", label: "Act now" },
];

const CONSENT = [
  { value: "private", label: "Private" },
  { value: "doctor", label: "My doctor only" },
  { value: "open", label: "Open NASA data" },
] as const;
type ConsentValue = (typeof CONSENT)[number]["value"];

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-8">
      <h2 className="mb-5 text-lg font-medium text-cream">{title}</h2>
      {children}
    </section>
  );
}

function StateGrid({ render }: { render: (s: Shown) => React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
      {STATES.map((s) => (
        <div key={s} className="flex flex-col gap-2">
          <span className="text-xs text-slate">{s}</span>
          {render(s)}
        </div>
      ))}
    </div>
  );
}

export default function DesignSystemPage() {
  const [done, setDone] = useState(false);
  const [consent, setConsent] = useState<ConsentValue>("private");

  return (
    <main className="mx-auto w-full max-w-[1400px] px-6 py-10 lg:px-12">
      <header>
        <p className="text-sm text-slate">ASTRA</p>
        <h1 className="mt-1 text-4xl font-light text-cream">Design system</h1>
      </header>

      <Row title="Palette">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PALETTE.map((p) => (
            <div key={p.name} className="surface flex flex-col rounded-panel p-4">
              <span className="h-16 rounded-field border border-rule" style={{ background: p.value }} />
              <span className="mt-3 flex items-baseline justify-between">
                <span className="text-sm font-medium text-cream">{p.name}</span>
                <span className="font-mono text-xs text-slate">{p.hex}</span>
              </span>
              <span className="mt-1 min-h-8 text-xs text-cream/70">{p.role}</span>
              <span className="mt-3 block">{p.example}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          {STATUSES.map((s) => (
            <span key={s.status} className="flex items-center gap-2 text-sm text-cream">
              <StatusDot status={s.status} />
              {s.label}
            </span>
          ))}
          <span className="text-xs text-slate">State is colour plus shape: dot, pulsing ring, fill.</span>
        </div>
        <div className="mt-8 flex flex-wrap items-end gap-10">
          <span className="text-5xl font-light text-cream">Headline</span>
          <span className="font-mono text-5xl font-light text-cream">78</span>
          <span className="text-xs text-slate">small label</span>
        </div>
      </Row>

      <Row title="Icons">
        <div className="flex flex-wrap gap-5 text-cyan">
          {ICONS.map((Icon, i) => (
            <Icon key={i} size={22} strokeWidth={1.5} aria-hidden="true" />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate">lucide-react, stroke 1.5</p>
      </Row>

      <Row title="Sparkline">
        <div className="grid gap-8 sm:grid-cols-3">
          <Sparkline values={HR} band={[50, 90]} stateColor="var(--cyan)" width="100%" height={48} className="block" />
          <Sparkline values={SLEEP} band={[7, 9.5]} stateColor="var(--amber)" width="100%" height={48} className="block" />
          <span className="flex items-center gap-3">
            <Sparkline values={HR} band={[50, 90]} stateColor="var(--cyan)" width={44} height={16} />
            <span className="text-xs text-slate">tag size</span>
          </span>
        </div>
      </Row>

      <Row title="Glass panel">
        <div className="grid gap-6 sm:grid-cols-2">
          <GlassPanel className="p-6">
            <p className="text-sm text-cream">Glass panel</p>
            <p className="mt-1 text-xs text-slate">Blur 18 px, 1 px border, inner highlight, radius 14.</p>
          </GlassPanel>
          <GlassPanel elevated className="p-6">
            <p className="text-sm text-cream">Elevated</p>
            <p className="mt-1 text-xs text-slate">Side panel only: the one shadow in the system.</p>
          </GlassPanel>
        </div>
      </Row>

      <Row title="Button">
        <div className="flex flex-col gap-6">
          <StateGrid
            render={(s) => (
              <Button variant="primary" force={force(s)} disabled={s === "disabled"} className="self-start">
                Open details
              </Button>
            )}
          />
          <StateGrid
            render={(s) => (
              <Button variant="quiet" force={force(s)} disabled={s === "disabled"} className="self-start">
                Close
              </Button>
            )}
          />
          <div className="surface-light rounded-panel p-4">
            <StateGrid
              render={(s) => (
                <Button variant="light" force={force(s)} disabled={s === "disabled"} className="self-start">
                  On cream
                </Button>
              )}
            />
          </div>
        </div>
      </Row>

      <Row title="Action row">
        <div className="flex flex-col gap-6">
          <StateGrid
            render={(s) => (
              <ActionRow
                label="Lights out by 21:30"
                icon={Moon}
                points={7}
                done={false}
                onDoneChange={() => {}}
                force={force(s)}
                disabled={s === "disabled"}
              />
            )}
          />
          <StateGrid
            render={(s) => (
              <ActionRow
                label="Lights out by 21:30"
                icon={Moon}
                points={7}
                done
                onDoneChange={() => {}}
                force={force(s)}
                disabled={s === "disabled"}
              />
            )}
          />
          <StateGrid
            render={(s) => (
              <ActionRow
                label="Lights out by 21:30"
                icon={Moon}
                points={7}
                featured
                done={s === "pressed"}
                onDoneChange={() => {}}
                force={force(s)}
                disabled={s === "disabled"}
              />
            )}
          />
          <div className="max-w-sm">
            <span className="text-xs text-slate">live</span>
            <ActionRow label="Drink 500 ml water" icon={Droplet} points={4} done={done} onDoneChange={setDone} className="mt-2" />
          </div>
        </div>
      </Row>

      <Row title="Segmented">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate">live</span>
            <Segmented aria-label="Consent, live" options={CONSENT} value={consent} onValueChange={setConsent} className="self-start" />
          </div>
          {(["hover", "focus", "pressed"] as const).map((state) => (
            <div key={state} className="flex flex-col gap-2">
              <span className="text-xs text-slate">{state} on my doctor only</span>
              <Segmented
                aria-label={`Consent, ${state}`}
                options={CONSENT}
                value="private"
                onValueChange={() => {}}
                force={{ value: "doctor", state }}
                className="self-start"
              />
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate">disabled</span>
            <Segmented aria-label="Consent, disabled" options={CONSENT} value="private" onValueChange={() => {}} disabled className="self-start" />
          </div>
        </div>
      </Row>

      <Row title="Body tag">
        <div className="flex flex-col gap-6">
          {STATUSES.map(({ status }) => (
            <StateGrid
              key={status}
              render={(s) => (
                <BodyTag
                  status={status}
                  name={status === "ok" ? "Heart rate" : status === "caution" ? "Sleep" : "Temperature"}
                  value={status === "ok" ? "64" : status === "caution" ? "6.1" : "38.4"}
                  history={{ values: status === "caution" ? SLEEP : HR, band: status === "caution" ? [7, 9.5] : [50, 90] }}
                  force={force(s)}
                  disabled={s === "disabled"}
                  className="w-[268px]"
                />
              )}
            />
          ))}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate">active (panel open)</span>
            <BodyTag status="ok" name="Heart rate" value="64" active history={{ values: HR, band: [50, 90] }} className="w-[268px] self-start" />
          </div>
        </div>
      </Row>

      <Row title="Range bar">
        <div className="grid gap-8 sm:grid-cols-3">
          <RangeBar inFrom={25} inTo={70} at={46} valueLabel="64 bpm" status="ok" />
          <RangeBar inFrom={30} inTo={64} at={18} valueLabel="6.1 h" status="caution" />
          <RangeBar inFrom={20} inTo={62} at={94} valueLabel="38.4 °C" status="act" />
        </div>
      </Row>

      <Row title="Score ring">
        <div className="flex flex-wrap gap-10">
          <ScoreRing score={86} size={160} />
          <ScoreRing score={72} size={160} />
          <ScoreRing score={48} size={160} />
        </div>
      </Row>
    </main>
  );
}
