"use client";

import { BodyMap } from "@/components/body/BodyMap";
import { ShieldCheck } from "lucide-react";
import { ActionRow, Button, ScoreRing, Segmented } from "@/components/ds";
import { EvaCountdown } from "@/components/EvaCountdown";
import { ACTIONS, MISSION_DAY } from "@/data/home";
import { useSimulator } from "@/lib/simulator";
import { useAppStore, type Consent } from "@/store/useAppStore";
import { useReadinessDetail } from "@/store/useReadiness";

/** The action with the most points gets the one cream surface on Home. */
const TOP_ACTION = [...ACTIONS].sort((a, b) => b.points - a.points)[0].id;

const CONSENT_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "doctor", label: "My doctor only" },
  { value: "open", label: "Open NASA data" },
] as const satisfies readonly { value: Consent; label: string }[];

export default function HomePage() {
  useSimulator();
  const { score, range } = useReadinessDetail();
  const completed = useAppStore((s) => s.completedActions);
  const toggleAction = useAppStore((s) => s.toggleAction);
  const consent = useAppStore((s) => s.consent);
  const setConsent = useAppStore((s) => s.setConsent);
  const openPanel = useAppStore((s) => s.openPanel);

  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-col px-6 pt-6 pb-28 outline-none fit:px-12 fit:py-5">
      <div className="grid flex-1 gap-8 fit:min-h-0 fit:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] fit:gap-12">
        <section aria-labelledby="diagnosis" className="flex flex-col fit:min-h-0">
          <header className="flex flex-wrap items-center gap-x-2.5 text-sm text-mute">
            <span>
              Mission day <span className="font-mono">{MISSION_DAY}</span>
            </span>
            <span aria-hidden="true">·</span>
            <EvaCountdown />
          </header>

          <div className="my-auto py-2">
            <h1 id="diagnosis" className="max-w-xl text-xl font-medium text-cream">
              {range ? (
                "One sensor is offline. Readiness is an estimate."
              ) : (
                <>
                  Your body is <span className="font-mono">{score}%</span> ready for tomorrow&apos;s spacewalk.
                </>
              )}
            </h1>

            {/* The ring gives way before anything else when the window is short. */}
            <div className="mt-4 w-[min(232px,26dvh)] min-w-40">
              <ScoreRing score={score} range={range} size={232} />
            </div>

            <h2 className="mt-4 text-xs text-mute">Before tomorrow</h2>
            <ul className="mt-2 flex max-w-md flex-col gap-2">
              {ACTIONS.map((a) => (
                <li key={a.id}>
                  <ActionRow
                    label={a.label}
                    icon={a.icon}
                    featured={a.id === TOP_ACTION}
                    points={a.points}
                    done={completed.includes(a.id)}
                    onDoneChange={() => toggleAction(a.id)}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3">
          <Segmented
            aria-label="Who sees your health data"
            options={CONSENT_OPTIONS}
            value={consent}
            onValueChange={(v) => {
              setConsent(v);
              openPanel({ kind: "packet" });
            }}
            itemProps={{ "data-panel-trigger": "" }}
          />
          <Button variant="quiet" data-panel-trigger="" onClick={() => openPanel({ kind: "packet" })}>
            <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />
            Privacy
          </Button>
          </div>
        </section>

        <section aria-label="Body" className="fit:min-h-0">
          <BodyMap />
        </section>
      </div>
    </main>
  );
}
