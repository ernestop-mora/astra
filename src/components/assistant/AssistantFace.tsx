"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { seeded } from "@/lib/history";
import { isDemoUrl } from "@/lib/useDemo";
import type { AssistantState, MouthShape } from "@/store/useAssistantStore";

/** Four mouth shapes with the same path structure, so they interpolate. */
const MOUTHS: Record<MouthShape, string> = {
  closed: "M 50 70 C 55 75 65 75 70 70 C 65 75.6 55 75.6 50 70 Z",
  small: "M 53 70 C 56 68.5 64 68.5 67 70 C 64 76 56 76 53 70 Z",
  wide: "M 49 68 C 55 66.5 65 66.5 71 68 C 67 80 53 80 49 68 Z",
  round: "M 55 72 C 55 65 65 65 65 72 C 65 80 55 80 55 72 Z",
};

/** Under reduced motion the halo colour, not movement, tells the states apart. */
const STILL_HALO: Record<AssistantState, string> = {
  idle: "var(--slate)",
  listening: "var(--cyan)",
  thinking: "var(--cream)",
  speaking: "var(--cyan)",
};

const HALO_CLASS: Record<AssistantState, string> = {
  idle: "assistant-breathe",
  listening: "",
  thinking: "",
  speaking: "assistant-vivid",
};

const EYES = [47, 73] as const;
const BARS = [48, 54, 60, 66, 72] as const;
const DOTS = [52, 60, 68] as const;

interface AssistantFaceProps {
  state: AssistantState;
  mouth: MouthShape;
  /** Rendered size in px */
  size: number;
  /** Crops to the orb, for the closed bubble. */
  compact?: boolean;
}

/** Blink every 3 to 6 s for 120 ms. Seeded in ?demo=1 so recordings match. */
function useBlink(enabled: boolean): boolean {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const rand = isDemoUrl() ? seeded(212) : Math.random;
    let timer = 0;
    const wait = () => {
      timer = window.setTimeout(() => {
        setBlink(true);
        timer = window.setTimeout(() => {
          setBlink(false);
          wait();
        }, 120);
      }, 3000 + rand() * 3000);
    };
    wait();
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return enabled && blink;
}

/**
 * The assistant's face: a cyan glass orb with two eyes and a mouth.
 * Decorative: the state is announced as text by the panel.
 */
export function AssistantFace({ state, mouth, size, compact = false }: AssistantFaceProps) {
  const id = useId();
  const reduced = useReducedMotion() ?? false;
  const blink = useBlink(!reduced);
  const halo = reduced ? STILL_HALO[state] : "var(--cyan)";
  const grow = state === "listening" ? 1.08 : 1;

  return (
    <svg
      viewBox={compact ? "18 14 84 84" : "0 0 120 120"}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="overflow-visible"
    >
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop offset="60%" style={{ stopColor: halo, stopOpacity: state === "speaking" ? 0.6 : 0.4 }} />
          <stop offset="100%" style={{ stopColor: halo, stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={`${id}-orb`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--navy-2)" }} />
          <stop offset="100%" style={{ stopColor: "var(--navy-3)" }} />
        </linearGradient>
        <radialGradient id={`${id}-inset`}>
          <stop offset="70%" style={{ stopColor: "var(--cyan)", stopOpacity: 0 }} />
          <stop offset="100%" style={{ stopColor: "var(--cyan)", stopOpacity: 0.3 }} />
        </radialGradient>
      </defs>

      {/* Diffuse halo */}
      <circle
        cx="60"
        cy="56"
        r="52"
        fill={`url(#${id}-halo)`}
        className={`assistant-part ${HALO_CLASS[state]}`}
        opacity={state === "idle" ? 0.6 : 1}
      />
      {state === "listening" && !reduced && (
        <circle
          cx="60"
          cy="56"
          r="41"
          fill="none"
          stroke="var(--cyan)"
          strokeWidth="1.5"
          className="assistant-part assistant-ring"
        />
      )}

      {/* Glass orb: gradient body, cyan rim with inner glow, curved reflection */}
      <circle cx="60" cy="56" r="40" fill={`url(#${id}-orb)`} />
      <circle cx="60" cy="56" r="40" fill={`url(#${id}-inset)`} />
      <circle cx="60" cy="56" r="40" fill="none" stroke="var(--cyan)" strokeWidth="1.5" />
      <path
        d="M 30 44 A 32 32 0 0 1 49 25"
        fill="none"
        stroke="var(--cream)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Eyes: cream capsules */}
      {EYES.map((x) => (
        <motion.rect
          key={x}
          x={x - 4}
          y={41}
          width={8}
          height={17}
          rx={4}
          fill="var(--cream)"
          initial={false}
          animate={{
            scaleX: grow,
            scaleY: blink ? 0.1 : grow,
            x: state === "thinking" ? 3 : 0,
            y: state === "thinking" ? -4 : 0,
          }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        />
      ))}

      {/* Mouth */}
      <motion.path
        fill="var(--navy)"
        stroke="var(--cream)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={false}
        animate={{ d: MOUTHS[mouth] }}
        transition={{ duration: mouth === "closed" ? 0.15 : 0.09, ease: "easeOut" }}
      />

      {/* Under the face: equalizer while listening, dots while thinking */}
      {!compact && state === "listening" && (
        <g fill="var(--cyan)">
          {BARS.map((x, i) => (
            <rect
              key={x}
              x={x - 1.5}
              y={106}
              width={3}
              height={12}
              rx={1.5}
              className="assistant-eq"
              style={{ animationDelay: `${-i * 170}ms`, animationDuration: `${620 + ((i * 3) % 5) * 60}ms` }}
            />
          ))}
        </g>
      )}
      {!compact && state === "thinking" && (
        <g fill="var(--cyan)">
          {DOTS.map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={114}
              r={2.4}
              className="assistant-part assistant-dot"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
