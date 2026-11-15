"use client";

import { useState } from "react";
import { ActionRow, RangeBar, Segmented, Sparkline, StatusBadge } from "@/components/ds";
import { cardHistory } from "./cardHistory";
import { cardView } from "./cardView";
import { useFaultNow } from "@/lib/faultClock";
import { ACTIONS, CARDS } from "@/data/home";
import { scalePosition, STATUS_COLOR, STATUS_RANK, THRESHOLDS, type CardId } from "@/lib/triage";
import { useAppStore } from "@/store/useAppStore";
import { useReadiness } from "@/store/useReadiness";
import type { AnchorId } from "./anchors";

/**
 * Zone detail. One metric at a time so it always fits the panel: a zone with
 * two metrics gets a switch, opened on the one that needs more attention.
 * Key it by zone so the score delta resets per opening.
 */
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
  const worst = cards.reduce((w, c) =>
    STATUS_RANK[cardView(c, readings, fault, now).status] > STATUS_RANK[cardView(w, readings, fault, now).status] ? c : w,
  );
  const [picked, setPicked] = useState<CardId | null>(null);
  const c = cards.find((x) => x.id === picked) ?? worst;
  const ids = cards.map((x) => x.id);
  const actions = ACTIONS.filter((a) => a.affects.some((id) => ids.includes(id)));

  const view = cardView(c, readings, fault, now);
  const status = view.status;
  const t = THRESHOLDS[c.sourceMetric];
  const source = view.lastSeen && fault ? fault.last : readings;
  const pos = scalePosition(c.sourceMetric, source[c.sourceMetric]);

  return (
    <>
      {cards.length > 1 && (
        <Segmented
          aria-label="Metric"
          options={cards.map((x) => ({ value: x.id, label: x.name }))}
          value={c.id}
          onValueChange={setPicked}
          className="mb-3 self-start"
        />
      )}

      <section aria-label={c.name} aria-live="polite" className="border-b border-rule pb-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm text-cream">{c.name}</h3>
          <StatusBadge status={status} />
        </div>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className={`font-mono text-xl tabular-nums ${view.lastSeen ? "text-mute" : "text-cream"}`}>{view.value}</span>
          <span className="text-xs text-mute">{c.unit}</span>
        </p>
        {view.lastSeen ? (
          <p className="mt-2 text-sm text-mute first-letter:uppercase">{view.lastSeen}</p>
        ) : (
          <>
            <Sparkline
              {...cardHistory(c, readings)}
              stateColor={STATUS_COLOR[status]}
              width="100%"
              height={36}
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
        <p className="mt-2 text-xs text-mute">
          In range{" "}
          <span className="font-mono">
            {t.min_green}-{t.max_green}
          </span>{" "}
          {t.unit}
          {c.sourceMetric === "systolic_bp" && " systolic"}
        </p>
        <p className="mt-2 text-sm text-cream">{c.eva}</p>
        <a
          href={t.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-sm text-mute underline underline-offset-2 hover:text-cream"
        >
          {t.source}
        </a>
      </section>

      <section className="pt-3" aria-labelledby="zone-actions">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="zone-actions" className="text-xs text-mute">
            Before tomorrow
          </h3>
          <span className="text-xs text-mute" aria-live="polite">
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
          <p className="mt-2 text-sm text-mute">No action today changes this zone.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {actions.map((a) => (
              <li key={a.id}>
                <ActionRow
                  size="sm"
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
