"use client";

import { useState } from "react";
import { ActionRow, RangeBar, Sparkline, StatusDot } from "@/components/ds";
import { cardHistory } from "./cardHistory";
import { cardView } from "./cardView";
import { useFaultNow } from "@/lib/faultClock";
import { ACTIONS, CARDS } from "@/data/home";
import { scalePosition, STATUS_COLOR, STATUS_LABEL, THRESHOLDS } from "@/lib/triage";
import { useAppStore } from "@/store/useAppStore";
import { useReadiness } from "@/store/useReadiness";
import type { AnchorId } from "./anchors";

/** Zone detail. Key it by zone so the score delta resets per opening. */
export function ZoneContent({ zone }: { zone: AnchorId }) {
  const readings = useAppStore((s) => s.readings);
  const fault = useAppStore((s) => s.sensorFault);
  const now = useFaultNow();
  const completed = useAppStore((s) => s.completedActions);
  const toggleAction = useAppStore((s) => s.toggleAction);
  const score = useReadiness();
  const [scoreAtOpen] = useState(score);
  const delta = score - scoreAtOpen;

  const cards = CARDS.filter((c) => c.anchor === zone);
  const ids = cards.map((c) => c.id);
  const actions = ACTIONS.filter((a) => a.affects.some((id) => ids.includes(id)));

  return (
    <>
      {cards.map((c) => {
        const view = cardView(c, readings, fault, now);
        const status = view.status;
        const t = THRESHOLDS[c.sourceMetric];
        const source = view.lastSeen && fault ? fault.last : readings;
        const pos = scalePosition(c.sourceMetric, source[c.sourceMetric]);
        return (
          <section key={c.id} aria-label={c.name} className="border-b border-rule pb-4 not-first:pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-cream">{c.name}</span>
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: STATUS_COLOR[status] }}>
                <StatusDot status={status} />
                {STATUS_LABEL[status]}
              </span>
            </div>
            <p className="flex items-baseline gap-1.5">
              <span className={`font-mono text-4xl font-light tabular-nums ${view.lastSeen ? "text-slate" : "text-cream"}`}>
                {view.value}
              </span>
              <span className="text-xs text-slate">{c.unit}</span>
            </p>
            {view.lastSeen ? (
              <p className="mt-2 text-sm text-slate first-letter:uppercase">{view.lastSeen}</p>
            ) : (
              <>
            <Sparkline
              {...cardHistory(c, readings)}
              stateColor={STATUS_COLOR[status]}
              width="100%"
              height={40}
              className="mt-2 block"
              label={`${c.name}, last 24 hours`}
            />
            <div className="mt-1">
              <RangeBar
                inFrom={pos.greenFrom}
                inTo={pos.greenTo}
                at={pos.value}
                valueLabel={`${readings[c.sourceMetric]}`}
                status={status}
              />
            </div>
              </>
            )}
            <p className="mt-1.5 text-xs text-slate">
              In range{" "}
              <span className="font-mono">
                {t.min_green}-{t.max_green}
              </span>{" "}
              {t.unit}
              {c.sourceMetric === "systolic_bp" && " systolic"}
            </p>
            <p className="mt-2 text-sm leading-snug text-cream/85">{c.eva}</p>
            <a
              href={t.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 block text-xs leading-snug text-slate underline decoration-slate/40 underline-offset-2 outline-none hover:text-cream focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-cyan"
            >
              {t.source}
            </a>
          </section>
        );
      })}

      <section className="pt-4" aria-labelledby="zone-actions">
        <div className="flex items-baseline justify-between gap-3">
          <h4 id="zone-actions" className="text-sm text-slate">
            Before tomorrow
          </h4>
          <span className="text-xs text-slate" aria-live="polite">
            Readiness <span className="font-mono text-cream">{score}</span>
            {delta !== 0 && (
              <span className="ml-1.5 font-mono text-cyan">
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            )}
          </span>
        </div>
        {actions.length === 0 ? (
          <p className="mt-3 text-sm text-slate">No action today changes this zone.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {actions.map((a) => (
              <li key={a.id}>
                <ActionRow
                  label={a.label}
                  icon={a.icon}
                  points={a.points}
                  done={completed.includes(a.id)}
                  onDoneChange={() => toggleAction(a.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
