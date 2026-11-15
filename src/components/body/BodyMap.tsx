"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  open: AnchorId | null;
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
 * ?demo=1 fixes camera and readings. ?open=heart|abdomen|torso|head opens a zone.
 * ?yaw=<degrees> sets the starting view (captures). ?body=svg forces the fallback.
 */
function readParams(): Params {
  if (cached) return cached;
  const q = new URLSearchParams(window.location.search);
  const open = q.get("open");
  const yaw = Number(q.get("yaw") ?? 0);
  cached = {
    renderer: q.get("body") !== "svg" && webglAvailable() ? "webgl" : "svg",
    demo: q.get("demo") === "1",
    open: isAnchorId(open) ? open : null,
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
  const stage = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const focus = panelState?.kind === "zone" ? panelState.zone : null;
  const nodeStatus = Object.fromEntries(
    ANCHOR_IDS.map((id) => [id, zoneStatus(id, CARDS, readings, offlineCards(fault)) ?? "ok"]),
  ) as Record<AnchorId, Status>;
  const open = (zone: AnchorId) => {
    setTouched(true);
    openPanel({ kind: "zone", zone });
  };

  // ?open=<zone> opens that zone once, deterministically.
  useEffect(() => {
    if (params.open) openPanel({ kind: "zone", zone: params.open });
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

  // The flat fallback publishes fixed zone positions, always facing the viewer.
  useEffect(() => {
    if (params.renderer !== "svg" || size.width === 0) return;
    const frame = Object.fromEntries(
      ANCHOR_IDS.map((id) => {
        const [x, y] = toStage(ANCHORS[id].position, size.width, size.height);
        return [id, { x, y, facing: 1 }];
      }),
    ) as AnchorFrame;
    bus.publish(frame);
  }, [bus, params.renderer, size]);

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
      <div ref={stage} className="relative h-[460px] overflow-hidden md:h-full md:min-h-[480px]">
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
        {params.renderer === "webgl" ? (
          <Body3D
            bus={bus}
            focus={focus}
            nodeStatus={nodeStatus}
            bpm={readings.heart_rate}
            frozen={params.demo || touched}
            initialYaw={params.yaw}
            reducedMotion={reduced}
          />
        ) : (
          <BodySilhouette width={size.width} height={size.height} />
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
            drawNodes={params.renderer === "svg"}
            onOpen={open}
          />
        </div>
        <SidePanel panelRef={panel} />
      </div>

      {/* Narrow screens: same tags as a list under the body */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
        {CARDS.map((c) => (
          <BodyTag
            key={c.id}
            data-panel-trigger
            onClick={() => open(c.anchor)}
            status={cardView(c, readings, fault, now).status}
            name={c.name}
            value={cardView(c, readings, fault, now).value}
            history={cardView(c, readings, fault, now).history}
            active={focus === c.anchor}
          />
        ))}
      </div>
    </div>
  );
}
