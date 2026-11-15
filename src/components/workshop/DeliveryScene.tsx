"use client";

import { useEffect, useRef, useState } from "react";
import type { Eta, ProfileId } from "@/lib/logistics";

/**
 * Earth-to-destination resupply scene, drawn entirely in SVG by code. No images,
 * no logos. `progress` runs over the whole timeline: first the wait for the next
 * departure (the cargo ship sits at Earth), then the flight.
 */

const W = 1600;
const H = 470;
const EARTH = { x: 210, y: 270, r: 118 };

interface Pt {
  x: number;
  y: number;
}

/* ---------- static decoration: 40 fixed stars ---------- */

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}
const STARS = (() => {
  const r = seeded(212);
  return Array.from({ length: 40 }, () => ({ x: r() * W, y: r() * (H - 40) + 10, s: 0.8 + r() * 0.9 }));
})();

/* ---------- route geometry ---------- */

interface Route {
  p0: Pt;
  p1: Pt;
  p2: Pt;
  p3: Pt;
}

function routeFor(profile: ProfileId): Route {
  const start = { x: EARTH.x + EARTH.r + 6, y: EARTH.y - 20 };
  const end =
    profile === "mars" ? { x: 1300, y: 250 } : profile === "moon" ? { x: 1350, y: 250 } : { x: 1340, y: 236 };
  const lift = profile === "iss" ? 150 : 90;
  return {
    p0: start,
    p1: { x: start.x + (end.x - start.x) * 0.3, y: lift },
    p2: { x: start.x + (end.x - start.x) * 0.72, y: lift },
    p3: end,
  };
}

function bez(r: Route, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * r.p0.x + 3 * u * u * t * r.p1.x + 3 * u * t * t * r.p2.x + t * t * t * r.p3.x,
    y: u * u * u * r.p0.y + 3 * u * u * t * r.p1.y + 3 * u * t * t * r.p2.y + t * t * t * r.p3.y,
  };
}

function tangent(r: Route, t: number): number {
  const u = 1 - t;
  const dx = 3 * u * u * (r.p1.x - r.p0.x) + 6 * u * t * (r.p2.x - r.p1.x) + 3 * t * t * (r.p3.x - r.p2.x);
  const dy = 3 * u * u * (r.p1.y - r.p0.y) + 6 * u * t * (r.p2.y - r.p1.y) + 3 * t * t * (r.p3.y - r.p2.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Maps a fraction of the route's length to the curve parameter, so time is even along the path. */
function lengthTable(r: Route) {
  const N = 200;
  const acc = [0];
  let prev = bez(r, 0);
  for (let i = 1; i <= N; i++) {
    const p = bez(r, i / N);
    acc.push(acc[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const total = acc[N];
  return (f: number) => {
    const target = Math.min(1, Math.max(0, f)) * total;
    const i = acc.findIndex((v) => v >= target);
    if (i <= 0) return 0;
    const span = acc[i] - acc[i - 1] || 1;
    return (i - 1 + (target - acc[i - 1]) / span) / N;
  };
}

const d = (r: Route) => `M ${r.p0.x} ${r.p0.y} C ${r.p1.x} ${r.p1.y} ${r.p2.x} ${r.p2.y} ${r.p3.x} ${r.p3.y}`;

/* ---------- bodies ---------- */

function Earth() {
  const { x, y, r } = EARTH;
  return (
    <g>
      <defs>
        <clipPath id="earth-clip">
          <circle cx={x} cy={y} r={r} />
        </clipPath>
      </defs>
      <circle cx={x} cy={y} r={r + 10} fill="none" stroke="var(--cyan)" strokeOpacity={0.18} strokeWidth={6} />
      <circle cx={x} cy={y} r={r} fill="var(--navy-3)" stroke="var(--cyan)" strokeWidth={2} />
      <g clipPath="url(#earth-clip)" fill="none" stroke="var(--slate)" strokeOpacity={0.5} strokeWidth={1}>
        {[-80, -40, 0, 40, 80].map((dy) => (
          <ellipse key={dy} cx={x} cy={y + dy} rx={r * Math.sqrt(1 - (dy / r) ** 2)} ry={10} />
        ))}
        <ellipse cx={x} cy={y} rx={46} ry={r} />
      </g>
    </g>
  );
}

function Destination({ profile }: { profile: ProfileId }) {
  if (profile === "mars") {
    const c = { x: 1400, y: 250, r: 92 };
    return (
      <g>
        <defs>
          <clipPath id="mars-clip">
            <circle cx={c.x} cy={c.y} r={c.r} />
          </clipPath>
        </defs>
        <circle cx={c.x} cy={c.y} r={c.r} fill="var(--cream)" fillOpacity={0.2} stroke="var(--slate)" strokeWidth={1.5} />
        <g clipPath="url(#mars-clip)" stroke="var(--slate)" strokeOpacity={0.45} fill="none">
          <path d={`M ${c.x - c.r} ${c.y - 40} Q ${c.x} ${c.y - 22} ${c.x + c.r} ${c.y - 44}`} strokeWidth={8} />
          <path d={`M ${c.x - c.r} ${c.y + 8} Q ${c.x} ${c.y + 26} ${c.x + c.r} ${c.y + 2}`} strokeWidth={12} />
          <path d={`M ${c.x - c.r} ${c.y + 54} Q ${c.x} ${c.y + 66} ${c.x + c.r} ${c.y + 50}`} strokeWidth={6} />
        </g>
      </g>
    );
  }
  if (profile === "moon") {
    const c = { x: 1400, y: 250, r: 48 };
    return (
      <g>
        <circle cx={c.x} cy={c.y} r={c.r} fill="var(--cream)" fillOpacity={0.2} stroke="var(--slate)" strokeWidth={1.5} />
        <g fill="none" stroke="var(--slate)" strokeOpacity={0.5}>
          <circle cx={c.x - 14} cy={c.y - 12} r={9} />
          <circle cx={c.x + 16} cy={c.y + 10} r={6} />
          <circle cx={c.x - 4} cy={c.y + 22} r={4} />
        </g>
      </g>
    );
  }
  // ISS: a small station on an orbital ring around Earth.
  const s = { x: 1380, y: 236 };
  return (
    <g>
      <ellipse
        cx={EARTH.x + 590}
        cy={EARTH.y - 20}
        rx={790}
        ry={150}
        fill="none"
        stroke="var(--slate)"
        strokeOpacity={0.4}
        strokeDasharray="2 6"
      />
      <g transform={`translate(${s.x} ${s.y})`}>
        <line x1={-46} y1={0} x2={46} y2={0} stroke="var(--slate)" strokeWidth={2} />
        {[-38, -22, 22, 38].map((dx) => (
          <rect key={dx} x={dx - 6} y={-20} width={12} height={40} rx={1.5} fill="var(--slate)" fillOpacity={0.8} />
        ))}
        <rect x={-14} y={-6} width={28} height={12} rx={4} fill="var(--cream)" />
      </g>
    </g>
  );
}

/** An original cargo ship: cream body, slate panels. */
function Ship({ at, angle }: { at: Pt; angle: number }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) rotate(${angle})`}>
      <rect x={-6} y={-24} width={12} height={16} rx={1.5} fill="var(--slate)" />
      <rect x={-6} y={8} width={12} height={16} rx={1.5} fill="var(--slate)" />
      <rect x={-20} y={-7} width={34} height={14} rx={6} fill="var(--cream)" />
      <path d="M 14 -6 L 24 0 L 14 6 Z" fill="var(--cream)" />
    </g>
  );
}

/* ---------- scene ---------- */

interface DeliverySceneProps {
  profile: ProfileId;
  eta: Eta;
  /** 0-1 over the whole timeline: wait, then flight */
  progress: number;
  counter: string | null;
}

export function DeliveryScene({ profile, eta, progress, counter }: DeliverySceneProps) {
  const route = routeFor(profile);
  const toT = lengthTable(route);
  const elapsed = progress * eta.totalDays;
  const flight = Math.min(1, Math.max(0, (elapsed - eta.waitDays) / eta.flightDays));
  const t = toT(flight);
  const ship = bez(route, t);
  const path = d(route);

  // Labels keep the type scale on screen whatever the drawing's size: text-xs for
  // the ticks, text-sm for the counter, converted to the drawing's own units.
  const svg = useRef<SVGSVGElement>(null);
  const [unit, setUnit] = useState(1);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const scale = Math.min(r.width / W, r.height / H);
      if (scale > 0) setUnit(rem / scale);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tickSize = 0.75 * unit;

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label={`Resupply route from Earth to ${eta.destination}`}
    >
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="var(--slate)" fillOpacity={0.35} />
      ))}

      <Earth />
      <Destination profile={profile} />

      <path d={path} fill="none" stroke="var(--slate)" strokeWidth={2} strokeDasharray="6 9" />
      {flight > 0 && (
        <path
          d={path}
          pathLength={1}
          fill="none"
          stroke="var(--cyan)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${flight} 1`}
        />
      )}

      {eta.ticks.map((tick) => {
        const tt = toT(tick.at);
        const p = bez(route, tt);
        const a = ((tangent(route, tt) - 90) * Math.PI) / 180;
        const done = tick.at <= flight;
        return (
          <g key={tick.label}>
            <line
              x1={p.x + Math.cos(a) * 7}
              y1={p.y + Math.sin(a) * 7}
              x2={p.x - Math.cos(a) * 7}
              y2={p.y - Math.sin(a) * 7}
              stroke={done ? "var(--cyan)" : "var(--slate)"}
              strokeWidth={1.5}
            />
            <text
              x={p.x + Math.cos(a) * (12 + tickSize)}
              y={p.y + Math.sin(a) * (12 + tickSize) + tickSize * 0.35}
              textAnchor="middle"
              className="font-mono"
              fontSize={tickSize}
              fill={done ? "var(--cyan)" : "var(--slate-text)"}
            >
              {tick.label}
            </text>
          </g>
        );
      })}

      <Ship at={ship} angle={tangent(route, t)} />

      {counter && (
        <text x={W - 24} y={0.875 * unit + 8} textAnchor="end" className="font-mono" fontSize={0.875 * unit} fill="var(--cream)">
          {counter}
        </text>
      )}
    </svg>
  );
}
