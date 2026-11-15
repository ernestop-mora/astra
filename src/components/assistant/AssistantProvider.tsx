"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEMO_TIMESTAMP } from "@/data/baseline";
import { EVA_OFFSET_MS } from "@/data/home";
import { answer, readinessAnswer, type AssistantContext } from "@/lib/assistant/answers";
import { evaTarget } from "@/lib/evaClock";
import { seeded } from "@/lib/history";
import { isProfileId } from "@/lib/logistics";
import { useAppStore } from "@/store/useAppStore";
import { useAssistantStore, type AssistantState, type MouthShape } from "@/store/useAssistantStore";
import { AssistantBubble } from "./AssistantBubble";
import { cancelSpeech, canSpeak, listen, speak, watchVoices, type Listener } from "./useSpeech";

/** The four suggested questions; ?ask= launches one by key. */
export const SUGGESTIONS = [
  { key: "readiness", text: "Can I do my job tomorrow?" },
  { key: "sensor", text: "Any sensor offline?" },
  { key: "spare", text: "When does a spare arrive?" },
  { key: "sharing", text: "What is shared?" },
] as const;

const WORD_MS = 330;
const REDUCED = "(prefers-reduced-motion: reduce)";
const STATES: readonly AssistantState[] = ["idle", "listening", "thinking", "speaking"];
const SHAPES: readonly MouthShape[] = ["closed", "small", "wide", "round"];

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** Weighted mouth shape: small 40%, wide 30%, round 20%, closed 10%. */
function pickMouth(r: number): MouthShape {
  if (r < 0.4) return "small";
  if (r < 0.7) return "wide";
  if (r < 0.9) return "round";
  return "closed";
}

export interface AssistantActions {
  ask: (text: string) => void;
  startListening: () => void;
  stopListening: () => void;
  toggleMute: () => void;
  open: () => void;
  close: () => void;
}

/**
 * All assistant logic, outside React: thinking, speaking, listening, timers.
 * Nothing is persisted; the conversation lives in memory for this session only.
 */
function createController(): AssistantActions & { init: () => () => void } {
  const get = () => useAssistantStore.getState();
  const set: ReturnType<typeof get>["set"] = (patch) => get().set(patch);

  /** Bumped on every interruption; stale callbacks compare against it and stop. */
  let run = 0;
  let timers: number[] = [];
  let listener: Listener | null = null;
  let demo = false;
  let rand: () => number = Math.random;
  let noticeSeen = false;
  /** Muting mid-answer cuts the voice but the subtitles carry on. */
  let dropVoice: (() => void) | null = null;

  const later = (fn: () => void, ms: number) => {
    timers.push(window.setTimeout(fn, ms));
  };

  function stopAll() {
    run++;
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
    dropVoice = null;
    cancelSpeech();
    listener?.abort();
    listener = null;
  }

  /** Runs fn once the first reading is in the store, or after 1.5 s without one. */
  function whenReadingsArrive(fn: () => void, delay: number) {
    const id = run;
    let fired = false;
    const go = () => {
      if (fired) return;
      fired = true;
      unsubscribe();
      if (id === run) later(fn, delay);
    };
    const unsubscribe = useAppStore.subscribe((s) => {
      if (s.readingsAt !== null) go();
    });
    if (useAppStore.getState().readingsAt !== null) go();
    else later(go, 1500);
  }

  function context(): AssistantContext {
    const s = useAppStore.getState();
    return {
      readings: s.readingsAt === null ? null : s.readings,
      completedActions: s.completedActions,
      consent: s.consent,
      sensorFault: s.sensorFault,
      profile: s.profile,
      now: demo ? DEMO_TIMESTAMP : Date.now(),
      evaRemainingMs: demo ? EVA_OFFSET_MS : evaTarget() - Date.now(),
    };
  }

  function respond(text: string, id: number) {
    const words = text.split(/\s+/).filter(Boolean);
    const reduced = window.matchMedia(REDUCED).matches;
    let voice = false;
    let boundarySeen = false;
    let done = false;
    let holdUntil = 0;

    const finish = () => {
      if (done || id !== run) return;
      done = true;
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
      dropVoice = null;
      // (c) the mouth closes; the last subtitle stays 4 s and fades.
      set({ shownWords: words.length, mouth: "closed", assistantState: "idle" });
      later(() => set({ subtitleVisible: false }), 4000);
      later(() => set({ subtitle: "", shownWords: 0, subtitleVisible: true }), 4600);
    };

    // (b) cyclic mouth timer, every 110 to 160 ms.
    const cycle = () => {
      if (done || id !== run) return;
      if (performance.now() >= holdUntil) {
        set({ mouth: reduced ? (get().mouth === "small" ? "closed" : "small") : pickMouth(rand()) });
      }
      later(cycle, reduced ? 280 : 110 + rand() * 50);
    };

    // Subtitles advance one word per tick unless the voice reports word boundaries.
    const tick = () => {
      if (done || id !== run) return;
      if (!boundarySeen) set({ shownWords: Math.min(words.length, get().shownWords + 1) });
      if (!voice && get().shownWords >= words.length) return later(finish, WORD_MS);
      later(tick, WORD_MS);
    };

    const toSubtitles = () => {
      voice = false;
      boundarySeen = false;
    };

    set({ subtitle: text, shownWords: 0, subtitleVisible: true, assistantState: "speaking", mouth: "small" });

    if (!get().muted && canSpeak()) {
      voice = speak(text, {
        // (a) each word boundary opens the mouth, back to small after 90 ms.
        onBoundary: (charIndex) => {
          if (done || id !== run) return;
          boundarySeen = true;
          const index = text.slice(0, charIndex).split(/\s+/).filter(Boolean).length;
          set({ shownWords: Math.max(get().shownWords, Math.min(words.length, index + 1)) });
          if (reduced) return;
          holdUntil = performance.now() + 90;
          set({ mouth: rand() < 0.6 ? "wide" : "round" });
          later(() => set({ mouth: "small" }), 90);
        },
        onEnd: () => (voice ? finish() : undefined),
        // Blocked or failed voice: carry on with subtitles only.
        onError: () => {
          if (id === run) toSubtitles();
        },
      });
      dropVoice = () => {
        toSubtitles();
        cancelSpeech();
      };
    }

    tick();
    later(cycle, 120);
    // Safety net: a voice that never reports its end.
    later(finish, words.length * WORD_MS * 2 + 4000);
  }

  function ask(raw: string) {
    const text = raw.trim();
    if (!text) return;
    stopAll();
    const id = run;
    set({
      panelOpen: true,
      pinned: false,
      lastQuestion: text,
      draft: "",
      assistantState: "thinking",
      subtitle: "",
      shownWords: 0,
      subtitleVisible: true,
      mouth: "closed",
    });
    // Consistent thinking time: the same question always takes the same 500 to 800 ms.
    later(() => {
      if (id === run) respond(answer(text, context()), id);
    }, demo ? 600 : 500 + (hash(text) % 301));
  }

  function startListening() {
    stopAll();
    const id = run;
    const first = !noticeSeen;
    noticeSeen = true;
    set({
      pinned: false,
      assistantState: "listening",
      draft: "",
      micDenied: false,
      mouth: "closed",
      subtitle: "",
      shownWords: 0,
      ...(first ? { voiceNotice: true } : {}),
    });
    listener = listen({
      onTranscript: (text) => {
        if (id === run) set({ draft: text });
      },
      onEnd: (text) => {
        if (id !== run) return;
        listener = null;
        if (text) ask(text);
        else set({ assistantState: "idle" });
      },
      onDenied: () => {
        if (id === run) set({ micDenied: true });
      },
    });
    if (!listener) set({ assistantState: "idle" });
  }

  function close() {
    stopAll();
    set({
      panelOpen: false,
      pinned: false,
      assistantState: "idle",
      mouth: "closed",
      subtitle: "",
      shownWords: 0,
      draft: "",
      voiceNotice: false,
    });
  }

  /** Reads the demo parameters once and wires the keyboard. */
  function init() {
    const q = new URLSearchParams(window.location.search);
    demo = q.get("demo") === "1";
    if (demo) rand = seeded(20261115);
    const unwatch = watchVoices();

    const profile = q.get("profile");
    if (isProfileId(profile)) useAppStore.getState().setProfile(profile);

    if (demo) {
      const state = q.get("state") as AssistantState | null;
      const mouth = q.get("mouth") as MouthShape | null;
      const question = SUGGESTIONS.find((s) => s.key === q.get("ask"));
      if (q.get("mute") === "1") set({ muted: true });
      if (q.get("assistant") === "open") set({ panelOpen: true });

      if ((state && STATES.includes(state)) || (mouth && SHAPES.includes(mouth))) {
        const pinnedState = state && STATES.includes(state) ? state : "speaking";
        set({
          panelOpen: true,
          pinned: true,
          assistantState: pinnedState,
          mouth: mouth && SHAPES.includes(mouth) ? mouth : pinnedState === "speaking" ? "wide" : "closed",
        });
        if (pinnedState === "speaking") {
          whenReadingsArrive(() => {
            const text = readinessAnswer(context());
            set({ subtitle: text, shownWords: text.split(/\s+/).length });
          }, 0);
        }
      } else if (question) {
        set({ panelOpen: true });
        whenReadingsArrive(() => ask(question.text), 500);
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && get().panelOpen) return close();
      if (e.key.toLowerCase() !== "a" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      if (get().panelOpen) close();
      else set({ panelOpen: true });
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      unwatch();
      stopAll();
    };
  }

  return {
    init,
    ask,
    startListening,
    stopListening: () => listener?.stop(),
    toggleMute: () => {
      const muted = !get().muted;
      set({ muted });
      if (muted) dropVoice?.();
    },
    open: () => set({ panelOpen: true }),
    close,
  };
}

const Ctx = createContext<AssistantActions | null>(null);

export function useAssistant(): AssistantActions {
  const actions = useContext(Ctx);
  if (!actions) throw new Error("useAssistant must be used inside AssistantProvider");
  return actions;
}

/** Mounted once in the layout: owns the assistant logic and renders the floating bubble. */
export function AssistantProvider() {
  const [controller] = useState(createController);
  useEffect(() => controller.init(), [controller]);
  return (
    <Ctx.Provider value={controller}>
      <AssistantBubble />
    </Ctx.Provider>
  );
}
