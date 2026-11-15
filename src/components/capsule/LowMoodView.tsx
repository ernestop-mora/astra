"use client";

import { Captions, Pause, Play, Wind } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ds";
import { BREATH, LOW_ID, SEALED, VIDEO, VOICE, type Sealed } from "@/lib/capsule/lowMood";
import { formatDuration } from "@/lib/capsule/types";

/** Six frames at 60 fps between one card and the next. */
const CASCADE_S = 6 / 60;
type Stage = "sealed" | "centred" | "opening" | "open";

/** Simulated playback: seconds advance on a timer; nothing is loaded or heard. */
function usePlayback(duration: number) {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setAt((s) => {
        const next = Math.min(duration, s + 0.25);
        if (next >= duration) setPlaying(false);
        return next;
      });
    }, 250);
    return () => window.clearInterval(t);
  }, [playing, duration]);
  const toggle = () => {
    if (!playing && at >= duration) setAt(0);
    setPlaying((p) => !p);
  };
  return { at, playing, toggle, started: at > 0 || playing };
}

function PlayButton({ playing, label, onClick }: { playing: boolean; label: string; onClick: () => void }) {
  const Icon = playing ? Pause : Play;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${playing ? "Pause" : "Play"} ${label}, simulated`}
      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-cream text-navy transition-transform duration-150 focus-visible:outline-cyan active:scale-[.96]"
    >
      <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}

function Progress({ at, duration, label }: { at: number; duration: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(at)}
        aria-valuetext={`${formatDuration(at)} of ${formatDuration(duration)}`}
        className="h-1.5 flex-1 overflow-hidden rounded-pill bg-slate"
      >
        <div className="h-full rounded-pill bg-cyan transition-[width] duration-200 ease-linear" style={{ width: `${(at / duration) * 100}%` }} />
      </div>
      <span className="font-mono text-xs text-mute">
        {formatDuration(at)} / {formatDuration(duration)}
      </span>
    </div>
  );
}

/** Illustrated and abstract: hills, a low sun, a path. No faces, no people. */
function Thumbnail() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 h-full w-full">
      <rect width="320" height="180" fill="var(--navy-3)" />
      <circle cx="226" cy="78" r="30" fill="var(--amber)" opacity="0.85" />
      <circle cx="226" cy="78" r="46" fill="none" stroke="var(--amber)" strokeOpacity="0.3" />
      <path d="M0 128 C60 96 110 104 160 122 S260 108 320 96 V180 H0 Z" fill="var(--navy-2)" />
      <path d="M0 150 C70 126 140 136 200 150 S280 140 320 132 V180 H0 Z" fill="var(--navy)" />
      <path d="M150 180 C160 160 180 150 210 142" fill="none" stroke="var(--cream)" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      <circle cx="70" cy="40" r="2" fill="var(--cream)" opacity="0.7" />
      <circle cx="110" cy="26" r="1.5" fill="var(--cream)" opacity="0.6" />
      <circle cx="40" cy="64" r="1.5" fill="var(--cream)" opacity="0.5" />
    </svg>
  );
}

function VideoCard() {
  const { at, playing, toggle, started } = usePlayback(VIDEO.durationSec);
  const caption = [...VIDEO.captions].reverse().find(([s]) => at >= s)?.[1] ?? "";
  return (
    <article aria-labelledby="low-video" className="surface flex flex-col rounded-panel p-4 fit:h-full fit:min-h-0">
      <div className="relative min-h-36 flex-1 overflow-hidden rounded-field small:aspect-video">
        <Thumbnail />
        <div className="absolute inset-0 grid place-items-center">
          <PlayButton playing={playing} label={VIDEO.title} onClick={toggle} />
        </div>
        {started && (
          <p data-caption="" className="absolute inset-x-3 bottom-3 rounded-field bg-navy/85 px-3 py-1.5 text-center text-sm text-cream">
            {caption}
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <h3 id="low-video" className="text-md font-medium text-cream">
          {VIDEO.title}
        </h3>
        <span className="flex items-center gap-2 text-xs text-mute">
          <span className="font-mono text-cream">{formatDuration(VIDEO.durationSec)}</span>
          <span className="flex items-center gap-1 rounded-pill border border-control px-2">
            <Captions size={14} strokeWidth={1.5} aria-hidden="true" />
            Captions
          </span>
        </span>
      </div>
      <p className="mt-1 text-sm text-mute">{VIDEO.label}</p>
      {started && (
        <div className="mt-2">
          <Progress at={at} duration={VIDEO.durationSec} label={VIDEO.title} />
        </div>
      )}
    </article>
  );
}

function VoiceCard() {
  const { at, playing, toggle, started } = usePlayback(VOICE.durationSec);
  const played = (at / VOICE.durationSec) * VOICE.bars.length;
  return (
    <article aria-labelledby="low-voice" className="surface flex flex-col rounded-panel p-4 fit:h-full fit:min-h-0">
      <div className="flex items-center gap-3">
        <PlayButton playing={playing} label={VOICE.title} onClick={toggle} />
        <svg viewBox={`0 0 ${VOICE.bars.length * 8} 40`} aria-hidden="true" className="h-10 min-w-0 flex-1">
          {VOICE.bars.map((h, i) => (
            <rect
              key={i}
              x={i * 8 + 2}
              y={20 - h * 18}
              width="4"
              height={h * 36}
              rx="2"
              fill={i < played ? "var(--cyan)" : "var(--slate-text)"}
            />
          ))}
        </svg>
        <span className="font-mono text-xs text-cream">{formatDuration(VOICE.durationSec)}</span>
      </div>
      <h3 id="low-voice" className="mt-3 text-md font-medium text-cream">
        {VOICE.title}
      </h3>
      <p className="mt-1 text-xs text-mute">Transcript</p>
      <p className="mt-1 text-sm text-cream">{VOICE.transcript}</p>
      {started && (
        <div className="mt-auto pt-3">
          <Progress at={at} duration={VOICE.durationSec} label={VOICE.title} />
        </div>
      )}
    </article>
  );
}

function PauseCard() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"in" | "out">("in");
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setPhase((p) => (p === "in" ? "out" : "in")), phase === "in" ? BREATH.inMs : BREATH.outMs);
    return () => window.clearTimeout(t);
  }, [running, phase]);
  const word = !running ? "4 s in, 6 s out" : phase === "in" ? "Breathe in" : "Breathe out";

  return (
    <article aria-labelledby="low-pause" data-pause-card="" className="surface flex flex-col rounded-panel p-4 fit:h-full fit:min-h-0">
      <div className="flex items-center gap-2">
        <Wind size={18} strokeWidth={1.5} aria-hidden="true" className="text-cyan" />
        <h3 id="low-pause" className="text-md font-medium text-cream">
          Take a minute
        </h3>
      </div>
      <div className="relative grid min-h-32 flex-1 place-items-center">
        <motion.div
          aria-hidden="true"
          className="aspect-square h-[80%] max-h-44 rounded-full border border-cyan-line bg-cyan-soft"
          initial={false}
          animate={{ scale: running && phase === "in" ? 1 : 0.6 }}
          transition={{ duration: running ? (phase === "in" ? BREATH.inMs : BREATH.outMs) / 1000 : 0.3, ease: "easeInOut" }}
        />
        <p className="absolute text-sm text-cream">{word}</p>
      </div>
      <Button
        variant="quiet"
        className="self-center"
        aria-pressed={running}
        onClick={() => {
          setPhase("in");
          setRunning((r) => !r);
        }}
      >
        {running ? "Stop" : "Start"}
      </Button>
    </article>
  );
}

/** A sealed capsule: lid, body and a seal across the join. */
function CapsuleGlyph({ open, animate }: { open: boolean; animate: boolean }) {
  const t = { duration: animate ? 0.45 : 0, ease: "easeOut" as const };
  return (
    <svg viewBox="0 0 40 44" aria-hidden="true" className="size-10 shrink-0 overflow-visible">
      <rect x="6" y="16" width="28" height="26" rx="5" fill="var(--navy-3)" stroke="var(--cream)" strokeOpacity="0.6" />
      <motion.g initial={false} animate={open ? { y: -9, rotate: -14, opacity: 0.9 } : { y: 0, rotate: 0 }} transition={t} style={{ originX: "10%", originY: "100%" }}>
        <rect x="4" y="8" width="32" height="9" rx="4" fill="var(--navy-2)" stroke="var(--cream)" strokeOpacity="0.6" />
      </motion.g>
      <motion.path d="M20 11 a5 5 0 0 0 0 10 Z" fill="var(--amber)" initial={false} animate={open ? { x: -6, rotate: -25, opacity: 0 } : { x: 0, rotate: 0, opacity: 1 }} transition={t} />
      <motion.path d="M20 11 a5 5 0 0 1 0 10 Z" fill="var(--amber)" initial={false} animate={open ? { x: 6, rotate: 25, opacity: 0 } : { x: 0, rotate: 0, opacity: 1 }} transition={t} />
    </svg>
  );
}

function SealedChip({ s, opened, animate }: { s: Sealed; opened: boolean; animate: boolean }) {
  const isLowOne = s.id === LOW_ID;
  return (
    <motion.li
      layout={animate ? "position" : false}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className={`flex min-w-0 items-center gap-3 rounded-panel px-3 py-2 ${
        isLowOne ? "surface [--surface-border:var(--cyan-line)]" : "border border-rule"
      }`}
    >
      <CapsuleGlyph open={isLowOne && opened} animate={animate} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-cream">{s.condition}</span>
        <span className="block truncate text-xs text-mute">
          {isLowOne && opened ? "Opened" : "Sealed"} {s.sealedOn} by {s.by}
        </span>
      </span>
    </motion.li>
  );
}

/**
 * Low-mood view of the Time capsule. Presentation only: it does not touch the
 * readiness score or any threshold. The capsule sealed for a low day moves to
 * the centre, its seal breaks and three cards follow.
 */
export function LowMoodView({ frozen, onNotNow }: { frozen: boolean; onNotNow: () => void }) {
  const reduced = useReducedMotion() ?? false;
  const still = frozen || reduced;
  const [stage, setStage] = useState<Stage>(still ? "open" : "sealed");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (still) return;
    const at = (ms: number, s: Stage) => timers.current.push(window.setTimeout(() => setStage(s), ms));
    at(120, "centred");
    at(620, "opening");
    at(1100, "open");
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, [still]);

  const low = SEALED.find((s) => s.id === LOW_ID) as Sealed;
  const others = SEALED.filter((s) => s.id !== LOW_ID);
  const order = stage === "sealed" ? SEALED : [others[0], low, others[1]];
  const opened = stage === "opening" || stage === "open";
  const cards = [<VideoCard key="v" />, <VoiceCard key="a" />, <PauseCard key="p" />];

  return (
    <div data-low-mood="" className="flex flex-1 flex-col gap-4 fit:min-h-0">
      <ul aria-label="Sealed messages" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {order.map((s) => (
          <SealedChip key={s.id} s={s} opened={opened} animate={!still} />
        ))}
      </ul>

      <ul aria-label="Opened for today" className="grid grid-cols-1 gap-4 lg:grid-cols-3 fit:min-h-0 fit:flex-1">
        {stage === "open" &&
          cards.map((card, i) => (
            <motion.li
              key={i}
              className="fit:min-h-0"
              initial={still ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * CASCADE_S, ease: "easeOut" }}
            >
              {card}
            </motion.li>
          ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <button
          type="button"
          onClick={onNotNow}
          className="min-h-6 cursor-pointer text-sm text-cream underline decoration-cream/50 underline-offset-4 hover:decoration-cream"
        >
          Not now
        </button>
        <p className="text-xs text-mute">Mood stays on this device. It is never shared unless you choose.</p>
      </div>
    </div>
  );
}
