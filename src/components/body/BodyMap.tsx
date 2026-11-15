"use client";

import { RotateCcw, RotateCw, ScanFace } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CARDS } from "@/data/home";
import { useAppStore } from "@/store/useAppStore";
import {
  ANCHOR_IDS,
  ANCHORS,
  createAnchorBus,
  isAnchorId,
  type AnchorFrame,
  type AnchorId,
} from "./anchors";
import type { TurnCommand } from "./Body3D";
import { BodySilhouette } from "./BodySilhouette";
import { toStage } from "./geometry";
import { cardView } from "./cardView";
import { offlineCards } from "@/data/sensors";
import { useFaultNow } from "@/lib/faultClock";
import { TagLayer, zoneStatus } from "./TagLayer";
import { SidePanel } from "@/components/SidePanel";
import { BodyTag } from "@/components/ds";
import type { Status } from "@/lib/triage";

const Body3D = dynamic(() => import("./Body3D"), { ssr: false });

/* ---------- page parameters, read once on the client ---------- */

interface Params {
  renderer: "svg" | "webgl";
  demo: boolean;
  open: AnchorId | "privacy" | null;
  yaw: number;
}

const SERVER_PARAMS: Params = { renderer: "svg", demo: false, open: null, yaw: 0 };

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

let cached: Params | null = null;
/**
 * ?demo=1 fixes camera and readings. ?open=heart|abdomen|torso|head opens a zone,
 * ?open=privacy the privacy panel. ?yaw=<degrees> sets the starting view
 * (captures). ?body=svg forces the flat fallback.
 */
function readParams(): Params {
  if (cached) return cached;
  const q = new URLSearchParams(window.location.search);
  const open = q.get("open");
  const yaw = Number(q.get("yaw") ?? 0);
  cached = {
    renderer: q.get("body") !== "svg" && webglAvailable() ? "webgl" : "svg",
    demo: q.get("demo") === "1",
    open: isAnchorId(open) ? open : open === "privacy" ? "privacy" : null,
    yaw: Number.isFinite(yaw) ? yaw : 0,
  };
  return cached;
}
const noSubscribe = () => () => {};

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** If the 3D model cannot load or draw, the flat silhouette takes over. */
class ModelBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const TURN_BUTTON =
  "grid size-10 cursor-pointer place-items-center rounded-full border border-control text-cream transition-colors duration-150 hover:border-cyan hover:bg-cyan-soft";

/* ---------- component ---------- */

export function BodyMap() {
  const readings = useAppStore((s) => s.readings);
  const fault = useAppStore((s) => s.sensorFault);
  const now = useFaultNow();
  const panelState = useAppStore((s) => s.panel);
  const openPanel = useAppStore((s) => s.openPanel);
  const closePanel = useAppStore((s) => s.closePanel);
  const params = useSyncExternalStore(noSubscribe, readParams, () => SERVER_PARAMS);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const [bus] = useState(createAnchorBus);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [touched, setTouched] = useState(false);
  const [turn, setTurn] = useState<TurnCommand | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const webgl = params.renderer === "webgl" && !modelFailed;
  const flat = !webgl || !modelReady;
  const focus = panelState?.kind === "zone" ? panelState.zone : null;
  const nodeStatus = Object.fromEntries(
    ANCHOR_IDS.map((id) => [id, zoneStatus(id, CARDS, readings, offlineCards(fault)) ?? "ok"]),
  ) as Record<AnchorId, Status>;
  const open = (zone: AnchorId) => {
    setTouched(true);
    openPanel({ kind: "zone", zone });
  };
  const rotate = (kind: TurnCommand["kind"]) => {
    setTouched(true);
    setTurn((t) => ({ kind, id: (t?.id ?? 0) + 1 }));
  };

  // ?open=<zone> or ?open=privacy opens that panel once, deterministically.
  useEffect(() => {
    if (params.open === "privacy") openPanel({ kind: "packet" });
    else if (params.open) openPanel({ kind: "zone", zone: params.open });
  }, [params.open, openPanel]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The flat silhouette publishes fixed zone positions, always facing the viewer.
  useEffect(() => {
    if (webgl || size.width === 0) return;
    const frame = Object.fromEntries(
      ANCHOR_IDS.map((id) => {
        const [x, y] = toStage(ANCHORS[id].position, size.width, size.height);
        return [id, { x, y, facing: 1 }];
      }),
    ) as AnchorFrame;
    bus.publish(frame);
  }, [bus, webgl, size]);

  // Escape or a click outside the panel closes it.
  useEffect(() => {
    if (!panelState) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || panel.current?.contains(target) || target.closest("[data-panel-trigger]")) return;
      closePanel();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [panelState, closePanel]);

  return (
    <div className="flex h-full flex-col">
      {/* Clipped sideways only (the panel slides in); a panel taller than the stage grows the page instead of being cut. */}
      <div ref={stage} className="relative h-[34rem] overflow-x-clip fit:h-full">
        {/* The one glow in the system: faint cyan behind the body */}
        <div aria-hidden="true" className="body-glow pointer-events-none absolute inset-0" />
        {/* Spatial context: fine orbital rings in slate, very faint, behind the body */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <g fill="none" stroke="var(--slate)" strokeWidth={0.15} vectorEffect="non-scaling-stroke">
            <ellipse cx={50} cy={54} rx={44} ry={11} transform="rotate(-14 50 54)" opacity={0.35} />
            <ellipse cx={50} cy={50} rx={36} ry={30} transform="rotate(20 50 50)" opacity={0.18} />
            <circle cx={50} cy={50} r={47} opacity={0.12} strokeDasharray="0.6 1.4" />
          </g>
        </svg>
        {flat && <BodySilhouette width={size.width} height={size.height} />}
        {webgl && (
          <ModelBoundary onError={() => setModelFailed(true)}>
            <Body3D
              bus={bus}
              focus={focus}
              nodeStatus={nodeStatus}
              bpm={readings.heart_rate}
              frozen={params.demo || touched}
              initialYaw={params.yaw}
              reducedMotion={reduced}
              turn={turn}
              onReady={() => setModelReady(true)}
            />
          </ModelBoundary>
        )}
        <div className="hidden md:block">
          <TagLayer
            width={size.width}
            height={size.height}
            bus={bus}
            cards={CARDS}
            readings={readings}
            fault={fault}
            now={now}
            focus={focus}
            panelOpen={panelState !== null}
            drawNodes={flat}
            onOpen={open}
          />
        </div>

        {/* Turning the body never depends on dragging: buttons, also reachable by keyboard. */}
        {webgl && panelState === null && (
          <div role="group" aria-label="Turn the body" className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
            <button type="button" aria-label="Turn left" className={TURN_BUTTON} onClick={() => rotate("left")}>
              <RotateCcw size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Reset view" className={TURN_BUTTON} onClick={() => rotate("reset")}>
              <ScanFace size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Turn right" className={TURN_BUTTON} onClick={() => rotate("right")}>
              <RotateCw size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        )}
        <SidePanel panelRef={panel} />
      </div>

      {/* Narrow screens: same tags as a list under the body */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
        {CARDS.map((c) => {
          const view = cardView(c, readings, fault, now);
          return (
            <BodyTag
              key={c.id}
              data-panel-trigger
              onClick={() => open(c.anchor)}
              status={view.status}
              name={c.name}
              value={view.value}
              unit={c.unit}
              history={view.history}
              active={focus === c.anchor}
            />
          );
        })}
      </div>
    </div>
  );
}
