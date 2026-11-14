"use client";

import { ActionButton } from "@/components/ActionButton";
import { ConsentBanner } from "@/components/ConsentBanner";
import { EvaCountdown } from "@/components/EvaCountdown";
import { MetricCard } from "@/components/MetricCard";
import { ScoreCircle } from "@/components/ScoreCircle";
import { ACTIONS, CARDS, MISSION_DAY } from "@/data/home";
import { useSimulator } from "@/lib/simulator";
import { readinessScore, triageCard, type Status } from "@/lib/triage";
import { useAppStore } from "@/store/useAppStore";

const SEVERITY: Record<Status, number> = { red: 0, amber: 1, green: 2 };

export default function HomePage() {
  useSimulator();
  const readings = useAppStore((s) => s.readings);
  const completed = useAppStore((s) => s.completedActions);
  const toggleAction = useAppStore((s) => s.toggleAction);

  const actionPoints = ACTIONS.filter((a) => completed.includes(a.id)).reduce(
    (sum, a) => sum + a.points,
    0,
  );
  const score = readinessScore(readings, actionPoints);
  // What needs attention comes first; stable order otherwise.
  const cards = [...CARDS].sort(
    (a, b) => SEVERITY[triageCard(a.id, readings)] - SEVERITY[triageCard(b.id, readings)],
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 lg:px-12 lg:py-14">
      <div className="grid flex-1 content-center gap-14 lg:grid-cols-[3fr_2fr] lg:gap-20">
        <section aria-labelledby="diagnosis">
          <header className="flex h-6 items-center gap-6">
            <p className="text-xs uppercase tracking-[0.25em] text-slate">
              Mission day <span className="font-mono">{MISSION_DAY}</span>
            </p>
            <EvaCountdown />
          </header>

          <h1
            id="diagnosis"
            className="mt-10 max-w-2xl text-4xl leading-tight font-light text-cream"
          >
            Your body is at <span className="font-mono">{score}%</span> readiness for
            tomorrow&apos;s EVA.
          </h1>

          <div className="mt-14 flex flex-col gap-12 md:flex-row md:items-center">
            <ScoreCircle score={score} size={240} />

            <div className="flex-1">
              <h2 className="text-xs uppercase tracking-[0.25em] text-slate">Before tomorrow</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {ACTIONS.map((a) => (
                  <li key={a.id}>
                    <ActionButton
                      action={a}
                      done={completed.includes(a.id)}
                      onToggle={() => toggleAction(a.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="vitals-heading">
          <h2 id="vitals-heading" className="flex h-6 items-center text-xs uppercase tracking-[0.25em] text-slate">
            Latest readings
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <MetricCard key={c.id} card={c} readings={readings} />
            ))}
          </div>
        </section>
      </div>

      <footer className="pt-12">
        <ConsentBanner />
      </footer>
    </main>
  );
}
