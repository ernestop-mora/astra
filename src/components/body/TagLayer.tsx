"use client";

import { useEffect, useRef } from "react";
import { BodyTag, StatusDot } from "@/components/ds";
import type { CardCopy } from "@/data/home";
import { STATUS_COLOR, STATUS_LABEL, STATUS_RANK, triageCard, type CardId, type Readings, type Status } from "@/lib/triage";
import type { SensorFault } from "@/store/useAppStore";
import { ANCHOR_IDS, ANCHORS, type AnchorBus, type AnchorId } from "./anchors";
import { cardView } from "./cardView";
import { pxPerUnit } from "./geometry";
import { BODY_HALF_WIDTH } from "./model.generated";

/**
 * Tags take the room between the stage edge and the hands (the body is 0.372 of
 * the stage height per unit and its hands reach 0.521 units out), up to 268 px.
 */
const tagWidth = (stageWidth: number, stageHeight: number) =>
  Math.round(Math.max(176, Math.min(268, stageWidth / 2 - BODY_HALF_WIDTH * pxPerUnit(stageHeight) - 16)));
const GAP = 10;

/** 0 when the zone faces away from the camera, 1 when it faces it. */
const visibility = (facing: number) => Math.min(1, Math.max(0, (facing + 0.05) * 5));

export function zoneStatus(
  zone: AnchorId,
  cards: readonly CardCopy[],
  readings: Readings,
  offline: readonly CardId[] = [],
): Status | null {
  const s = cards.filter((c) => c.anchor === zone).map((c) => triageCard(c.id, readings, offline));
  return s.length === 0 ? null : s.reduce((w, x) => (STATUS_RANK[x] > STATUS_RANK[w] ? x : w));
}

interface TagLayerProps {
  width: number;
  height: number;
  bus: AnchorBus;
  cards: readonly CardCopy[];
  readings: Readings;
  fault: SensorFault | null;
  /** Clock for "last reading" ages */
  now: number;
  focus: AnchorId | null;
  /** Any side panel open (zone or data packet): tags and lines step back. */
  panelOpen: boolean;
  /** Draw the node dots here. False when the 3D renderer draws its own nodes. */
  drawNodes: boolean;
  onOpen: (zone: AnchorId) => void;
}

/**
 * Fixed tags at the stage edges, leader lines to zone nodes that follow the
 * renderer. Positions arrive through the bus and are written straight to the DOM.
 */
export function TagLayer({ width, height, bus, cards, readings, fault, now, focus, panelOpen, drawNodes, onOpen }: TagLayerProps) {
  const offline = cards.filter((c) => cardView(c, readings, fault, now).status === "offline").map((c) => c.id);
  const lines = useRef<Partial<Record<CardId, SVGPolylineElement | null>>>({});
  const tags = useRef<Partial<Record<CardId, HTMLButtonElement | null>>>({});
  const nodes = useRef<Partial<Record<AnchorId, HTMLButtonElement | null>>>({});

  const TAG_W = tagWidth(width, height);

  useEffect(() => {
    if (width === 0 || height === 0) return;
    // With a panel open, tags and lines step back; only the open zone's node stays.
    const focused = panelOpen;
    return bus.subscribe((frame) => {
      for (const c of cards) {
        const f = frame[c.anchor];
        const vis = visibility(f.facing);
        const ty = c.v * height;
        const tx = c.side === "left" ? TAG_W + GAP : width - TAG_W - GAP;
        const elbow = tx + (c.side === "left" ? 24 : -24);
        const line = lines.current[c.id];
        if (line) {
          line.setAttribute("points", `${tx},${ty} ${elbow},${ty} ${f.x},${f.y}`);
          line.style.opacity = focused ? "0" : String(vis);
        }
        const tag = tags.current[c.id];
        if (tag) {
          tag.style.opacity = focused ? "0" : String(0.35 + 0.65 * vis);
          tag.style.pointerEvents = focused ? "none" : "auto";
        }
      }
      for (const id of ANCHOR_IDS) {
        const node = nodes.current[id];
        if (!node) continue;
        const f = frame[id];
        const vis = focused && id !== focus ? 0 : visibility(f.facing);
        node.style.transform = `translate(${f.x - 12}px, ${f.y - 12}px)`;
        node.style.opacity = String(vis);
        node.style.pointerEvents = vis > 0.3 ? "auto" : "none";
      }
    });
  }, [bus, cards, readings, width, height, focus, panelOpen, TAG_W]);

  if (width === 0 || height === 0) return null;

  return (
    <>
      <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden="true">
        {cards.map((c) => {
          const status = triageCard(c.id, readings, offline);
          return (
            <polyline
              key={c.id}
              ref={(el) => {
                lines.current[c.id] = el;
              }}
              fill="none"
              stroke={status === "ok" ? "var(--cyan-line)" : STATUS_COLOR[status]}
              strokeWidth={1}
              strokeDasharray={status === "offline" ? "3 4" : undefined}
              style={{ opacity: 0 }}
            />
          );
        })}
      </svg>

      {ANCHOR_IDS.map((id) => {
        const status = zoneStatus(id, cards, readings, offline);
        if (!status) return null;
        return (
          <button
            key={id}
            ref={(el) => {
              nodes.current[id] = el;
            }}
            type="button"
            data-panel-trigger
            onClick={() => onOpen(id)}
            aria-label={`${ANCHORS[id].label} zone, ${STATUS_LABEL[status].toLowerCase()}`}
            aria-expanded={focus === id}
            tabIndex={panelOpen && focus !== id ? -1 : 0}
            className={`absolute top-0 left-0 grid size-6 cursor-pointer place-items-center rounded-full ${
              drawNodes ? "before:absolute before:size-4 before:rounded-full before:bg-navy/85 before:content-['']" : ""
            }`}
            style={{ opacity: 0 }}
          >
            {/* With WebGL the node is drawn in 3D; this button stays as the click and focus target. */}
            {!drawNodes ? null : id === "heart" ? (
              // Beats at the shown heart rate, 1.00 to 1.03. Reduced motion stops it (globals.css).
              <span
                className="relative grid place-items-center animate-[heart-beat_1s_ease-out_infinite]"
                style={{ animationDuration: `${60 / Math.max(30, readings.heart_rate)}s` }}
              >
                <StatusDot status={status} />
              </span>
            ) : (
              <StatusDot status={status} className="relative" />
            )}
          </button>
        );
      })}

      {cards.map((c) => {
        const view = cardView(c, readings, fault, now);
        return (
          <BodyTag
            key={c.id}
            ref={(el) => {
              tags.current[c.id] = el;
            }}
            data-panel-trigger
            onClick={() => onOpen(c.anchor)}
            aria-expanded={focus === c.anchor}
            tabIndex={panelOpen ? -1 : 0}
            status={view.status}
            name={c.name}
            value={view.value}
            unit={c.unit}
            history={view.history}
            aside={view.lastSeen ? view.lastSeen.replace("last reading ", "") : undefined}
            active={focus === c.anchor}
            className="absolute -translate-y-1/2"
            style={{ width: TAG_W, top: c.v * height, ...(c.side === "left" ? { left: 0 } : { right: 0 }) }}
          />
        );
      })}
    </>
  );
}
