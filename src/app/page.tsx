"use client";

import { BodyMap } from "@/components/body/BodyMap";
import { ActionRow, ScoreRing, Segmented } from "@/components/ds";
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
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-6 py-8 lg:h-[calc(100dvh-3.5rem)] lg:px-12 lg:py-6">
      <div className="grid flex-1 gap-10 lg:min-h-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <section aria-labelledby="diagnosis" className="flex flex-col lg:min-h-0">
          <header className="flex items-center gap-2.5 text-sm text-slate">
            <span>
              Mission day <span className="font-mono">{MISSION_DAY}</span>
            </span>
            <span aria-hidden="true">·</span>
            <EvaCountdown />
          </header>

          <div className="my-auto py-8">
            <h1 id="diagnosis" className="max-w-2xl text-5xl leading-[1.1] font-light text-cream">
              {range ? (
                "One sensor is offline. Readiness is an estimate."
              ) : (
                <>
                  Your body is <span className="font-mono">{score}%</span> ready for tomorrow&apos;s EVA.
                </>
              )}
            </h1>

            <div className="mt-8">
              <ScoreRing score={score} range={range} size={232} />
            </div>

            <h2 className="mt-10 text-xs text-slate">Before tomorrow</h2>
            <ul className="mt-3 flex max-w-md flex-col gap-2.5">
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

          <Segmented
            aria-label="Who sees your health data"
            options={CONSENT_OPTIONS}
            value={consent}
            onValueChange={(v) => {
              setConsent(v);
              openPanel({ kind: "packet" });
            }}
            itemProps={{ "data-panel-trigger": "" }}
            className="self-start"
          />
        </section>

        <section aria-label="Body" className="lg:min-h-0">
          <BodyMap />
        </section>
      </div>
    </main>
  );
}
