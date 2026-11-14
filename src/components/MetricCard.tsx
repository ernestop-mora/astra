import type { CardCopy } from "@/data/home";
import {
  scalePosition,
  STATUS_COLOR,
  STATUS_LABEL,
  triageCard,
  type Readings,
} from "@/lib/triage";

interface MetricCardProps {
  card: CardCopy;
  readings: Readings;
}

export function MetricCard({ card, readings }: MetricCardProps) {
  const status = triageCard(card.id, readings);
  const color = STATUS_COLOR[status];
  const pos = scalePosition(card.barMetric, readings[card.barMetric]);

  return (
    <article className="rounded-lg bg-card-bg px-5 py-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm text-slate">{card.name}</h3>
        {status !== "green" && (
          <span className="text-xs font-medium" style={{ color }}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </header>

      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-light tabular-nums text-cream">
          {card.format(readings)}
        </span>
        <span className="text-xs text-slate">{card.unit}</span>
      </p>

      <div className="relative mt-3 h-1 rounded-full bg-navy-3" aria-hidden="true">
        <div
          className="absolute inset-y-0 rounded-full bg-rule"
          style={{ left: `${pos.greenFrom}%`, width: `${pos.greenTo - pos.greenFrom}%` }}
        />
        <div
          className="absolute -top-1 h-3 w-0.5 -translate-x-1/2 rounded-full"
          style={{ left: `${pos.value}%`, background: color, transition: "left 600ms ease" }}
        />
      </div>

      <p className="mt-3 text-xs leading-snug text-cream/60">{card.relevance}</p>
    </article>
  );
}
