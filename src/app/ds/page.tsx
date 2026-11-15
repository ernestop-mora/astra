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
import { useEffect, useState } from "react";
import {
  ActionRow,
  BodyTag,
  Button,
  GlassPanel,
  RangeBar,
  ScoreRing,
  Segmented,
  Sparkline,
  StatusBadge,
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
    example: <span className="block h-8 rounded-field border border-rule bg-navy" />,
  },
  {
    name: "navy-2",
    hex: "#20384A",
    value: "var(--navy-2)",
    role: "Depth layer: surfaces",
    example: (
      <span className="block rounded-field bg-navy-2 p-1.5">
        <span className="block h-5 rounded-field bg-navy-3" />
      </span>
    ),
  },
  {
    name: "navy-3",
    hex: "#2A4659",
    value: "var(--navy-3)",
    role: "Depth layer: cards and panels",
    example: <span className="surface block h-8 rounded-field" />,
  },
  {
    name: "cream",
    hex: "#E9E4E0",
    value: "var(--cream)",
    role: "Main text and light surfaces",
    example: <span className="surface-light flex h-8 items-center rounded-field px-3 text-sm">Featured card</span>,
  },
  {
    name: "slate",
    hex: "#6E7575",
    value: "var(--slate)",
    role: "Lines and inactive marks; lifted for text",
    example: (
      <span className="flex h-8 flex-col justify-center gap-1 text-xs text-mute">
        Secondary label
        <span className="block h-px bg-slate" />
      </span>
    ),
  },
  {
    name: "cyan",
    hex: "#62D4E6",
    value: "var(--cyan)",
    role: "Data, interaction and signal",
    example: <Sparkline values={HR} band={[50, 90]} stateColor="var(--cyan)" width="100%" height={32} className="block" />,
  },
  {
    name: "amber",
    hex: "#E8A838",
    value: "var(--amber)",
    role: "Caution state",
    example: (
      <span className="flex h-8 items-center">
        <StatusBadge status="caution" />
      </span>
    ),
  },
  {
    name: "coral",
    hex: "#FC563C",
    value: "var(--coral)",
    role: "Alert, new, one emphasis per screen",
    example: (
      <span className="flex h-8 items-center gap-2 text-sm text-cream">
        <span className="size-2.5 rounded-full bg-coral" /> New
      </span>
    ),
  },
];

/** The one type scale. Sizes are rem tokens on :root (globals.css). */
const TYPE: readonly { token: string; rem: string; use: string; className: string; sample: string }[] = [
  { token: "--text-figure", rem: "3rem", use: "Large figures, DM Mono", className: "font-mono text-figure", sample: "78" },
  { token: "--text-xl", rem: "1.75rem", use: "Page headline", className: "text-xl font-medium", sample: "Headline" },
  { token: "--text-lg", rem: "1.25rem", use: "Panel heading", className: "text-lg font-medium", sample: "Panel heading" },
  { token: "--text-md", rem: "1rem", use: "Body", className: "text-md", sample: "Body text, line height 1.5" },
  { token: "--text-sm", rem: "0.875rem", use: "Controls and secondary text", className: "text-sm", sample: "Controls and secondary text" },
  { token: "--text-xs", rem: "0.75rem", use: "Short labels and metadata only", className: "text-xs", sample: "Short label" },
];

const STATUSES: readonly Status[] = ["ok", "caution", "act", "offline"];

const CONSENT = [
  { value: "private", label: "Private" },
  { value: "doctor", label: "My doctor only" },
  { value: "open", label: "Open NASA data" },
] as const;
type ConsentValue = (typeof CONSENT)[number]["value"];

const SECTIONS = [
  { value: "colour", label: "Colour" },
  { value: "type", label: "Type" },
  { value: "buttons", label: "Buttons" },
  { value: "switch", label: "Segmented" },
  { value: "rows", label: "Action rows" },
  { value: "tags", label: "Body tags" },
  { value: "data", label: "Data" },
] as const;
type SectionId = (typeof SECTIONS)[number]["value"];

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-mute">{children}</span>;
}

function StateGrid({ render, light = false }: { render: (s: Shown) => React.ReactNode; light?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 fit:grid-cols-5">
      {STATES.map((s) => (
        <div key={s} className="flex flex-col gap-1.5">
          {light ? <span className="text-xs text-navy">{s}</span> : <Label>{s}</Label>}
          {render(s)}
        </div>
      ))}
    </div>
  );
}

/** The catalog, one section at a time so each fits the screen without scrolling. */
export default function DesignSystemPage() {
  const [section, setSection] = useState<SectionId>("colour");
  // ?section=<name> opens one section directly (audits and captures).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("section");
    const found = SECTIONS.find((s) => s.value === wanted);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL after hydration
    if (found) setSection(found.value);
  }, []);
  const [done, setDone] = useState(false);
  const [consent, setConsent] = useState<ConsentValue>("private");

  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-col px-6 pt-6 pb-28 outline-none fit:px-12 fit:py-5">
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <h1 className="text-xl font-medium text-cream">Design system</h1>
        <Segmented aria-label="Section" options={SECTIONS} value={section} onValueChange={setSection} />
      </header>

      <section aria-label={SECTIONS.find((s) => s.value === section)?.label} className="mt-5 min-h-0 flex-1 border-t border-rule pt-5">
        {section === "colour" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 fit:grid-cols-4">
              {PALETTE.map((p) => (
                <div key={p.name} className="surface flex flex-col rounded-panel p-3">
                  <span className="h-8 rounded-field border border-rule" style={{ background: p.value }} />
                  <span className="mt-2 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-cream">{p.name}</span>
                    <span className="font-mono text-xs text-mute">{p.hex}</span>
                  </span>
                  <span className="text-xs text-mute">{p.role}</span>
                  <span className="mt-2 block">{p.example}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2">
              {STATUSES.map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
              <Label>State is never colour alone: an icon and a word each.</Label>
            </div>
            <p className="mt-2 text-sm text-mute">
              Text on dark uses slate-text <span className="font-mono">#B8B8B5</span> (5.0:1 on navy-3). Control edges use cream at 50%
              (3.2:1 on navy-3).
            </p>
          </>
        )}

        {section === "type" && (
          <div className="grid gap-x-12 gap-y-6 fit:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <ul className="flex flex-col gap-3">
              {TYPE.map((t) => (
                <li key={t.token} className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-baseline gap-4 border-b border-rule pb-3">
                  <span className="flex flex-col text-xs text-mute">
                    <span className="font-mono text-cream">
                      {t.token} {t.rem}
                    </span>
                    {t.use}
                  </span>
                  <span className={`text-cream ${t.className}`}>{t.sample}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <Label>Weights: 400, 500 and 600 only</Label>
                <span className="text-md text-cream">Space Grotesk 400</span>
                <span className="text-md font-medium text-cream">Space Grotesk 500</span>
                <span className="text-md font-semibold text-cream">Space Grotesk 600</span>
                <span className="font-mono text-md text-cream">DM Mono 400 for every number</span>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Line height: 1.5 for reading, 1.2 for headings and figures</Label>
                <Label>Icons: lucide-react, stroke 1.5</Label>
                <div className="flex flex-wrap gap-4 text-cyan">
                  {ICONS.map((Icon, i) => (
                    <Icon key={i} size={22} strokeWidth={1.5} aria-hidden="true" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === "buttons" && (
          <div className="flex flex-col gap-5">
            <Label>Primary: the one filled pill, one per view</Label>
            <StateGrid
              render={(s) => (
                <Button variant="primary" force={force(s)} disabled={s === "disabled"} className="self-start">
                  Add files
                </Button>
              )}
            />
            <Label>Quiet: every other action</Label>
            <StateGrid
              render={(s) => (
                <Button variant="quiet" force={force(s)} disabled={s === "disabled"} className="self-start">
                  Close
                </Button>
              )}
            />
            <div className="surface-light rounded-panel p-4">
              <StateGrid
                light
                render={(s) => (
                  <Button variant="light" force={force(s)} disabled={s === "disabled"} className="self-start">
                    On cream
                  </Button>
                )}
              />
            </div>
          </div>
        )}

        {section === "switch" && (
          <div className="grid gap-x-12 gap-y-5 fit:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>live</Label>
              <Segmented aria-label="Consent, live" options={CONSENT} value={consent} onValueChange={setConsent} className="self-start" />
            </div>
            {(["hover", "focus", "pressed"] as const).map((state) => (
              <div key={state} className="flex flex-col gap-1.5">
                <Label>{state} on my doctor only</Label>
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
            <div className="flex flex-col gap-1.5">
              <Label>disabled</Label>
              <Segmented aria-label="Consent, disabled" options={CONSENT} value="private" onValueChange={() => {}} disabled className="self-start" />
            </div>
          </div>
        )}

        {section === "rows" && (
          <div className="flex flex-col gap-5">
            <StateGrid
              render={(s) => (
                <ActionRow label="Lights out by 21:30" icon={Moon} points={7} done={false} onDoneChange={() => {}} force={force(s)} disabled={s === "disabled"} />
              )}
            />
            <StateGrid
              render={(s) => (
                <ActionRow label="Lights out by 21:30" icon={Moon} points={7} done onDoneChange={() => {}} force={force(s)} disabled={s === "disabled"} />
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
            <div className="grid gap-6 fit:grid-cols-5">
              <div className="flex flex-col gap-1.5">
                <Label>live</Label>
                <ActionRow label="Drink 500 ml water" icon={Droplet} points={4} done={done} onDoneChange={setDone} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>compact</Label>
                <ActionRow size="sm" label="Clean the new site" done={false} onDoneChange={() => {}} />
              </div>
            </div>
          </div>
        )}

        {section === "tags" && (
          <div className="flex flex-col gap-5">
            {(["ok", "caution", "act"] as const).map((status) => (
              <StateGrid
                key={status}
                render={(s) => (
                  <BodyTag
                    status={status}
                    name={status === "ok" ? "Heart rate" : status === "caution" ? "Sleep" : "Temperature"}
                    value={status === "ok" ? "64" : status === "caution" ? "6.1" : "38.4"}
                    unit={status === "ok" ? "bpm" : status === "caution" ? "h" : "°C"}
                    history={{ values: status === "caution" ? SLEEP : HR, band: status === "caution" ? [7, 9.5] : [50, 90] }}
                    force={force(s)}
                    disabled={s === "disabled"}
                  />
                )}
              />
            ))}
            <div className="grid gap-6 fit:grid-cols-5">
              <div className="flex flex-col gap-1.5">
                <Label>active (panel open)</Label>
                <BodyTag status="ok" name="Heart rate" value="64" unit="bpm" active history={{ values: HR, band: [50, 90] }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>no signal</Label>
                <BodyTag status="offline" name="Glucose" value="94" unit="mg/dL" aside="3 h ago" />
              </div>
            </div>
          </div>
        )}

        {section === "data" && (
          <div className="grid gap-x-12 gap-y-6 fit:grid-cols-2">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label>Sparkline: 24 hours over the in-range band</Label>
                <div className="grid grid-cols-2 gap-6">
                  <Sparkline values={HR} band={[50, 90]} stateColor="var(--cyan)" width="100%" height={40} className="block" />
                  <Sparkline values={SLEEP} band={[7, 9.5]} stateColor="var(--amber)" width="100%" height={40} className="block" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Range bar</Label>
                <div className="grid grid-cols-3 gap-6">
                  <RangeBar inFrom={25} inTo={70} at={46} valueLabel="64 bpm" status="ok" />
                  <RangeBar inFrom={30} inTo={64} at={18} valueLabel="6.1 h" status="caution" />
                  <RangeBar inFrom={20} inTo={62} at={94} valueLabel="38.4 °C" status="act" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <GlassPanel className="p-4">
                  <p className="text-sm font-medium text-cream">Glass panel</p>
                  <p className="text-xs text-mute">Blur 18 px, 1 px border, radius 14.</p>
                </GlassPanel>
                <GlassPanel elevated className="p-4">
                  <p className="text-sm font-medium text-cream">Elevated</p>
                  <p className="text-xs text-mute">Side panel only: the one shadow.</p>
                </GlassPanel>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Score ring: cyan from 80, amber 60 to 79, coral below</Label>
              <div className="flex flex-wrap gap-8">
                <ScoreRing score={86} size={168} />
                <ScoreRing score={72} size={168} />
                <ScoreRing score={48} size={168} />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
