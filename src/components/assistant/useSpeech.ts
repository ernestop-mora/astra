"use client";

import { useSyncExternalStore } from "react";

/* ---------- Speech recognition: minimal typings (not in every lib.dom) ---------- */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}
interface RecognitionEvent {
  results: ArrayLike<RecognitionResult>;
}
interface RecognitionErrorEvent {
  error: string;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canRecognize = () => recognitionCtor() !== null;
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

const noSubscribe = () => () => {};

/** Browser support, known only on the client. Both false during SSR. */
export function useSpeechSupport(): { recognition: boolean; synthesis: boolean } {
  const recognition = useSyncExternalStore(noSubscribe, canRecognize, () => false);
  const synthesis = useSyncExternalStore(noSubscribe, canSpeak, () => false);
  return { recognition, synthesis };
}

/* ---------- Synthesis ---------- */

let voices: SpeechSynthesisVoice[] = [];

/** Call once on the client: the voice list often arrives late (voiceschanged). */
export function watchVoices(): () => void {
  if (!canSpeak()) return () => {};
  const load = () => {
    voices = window.speechSynthesis.getVoices();
  };
  load();
  window.speechSynthesis.addEventListener("voiceschanged", load);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
}

/** macOS novelty voices: never pick these. */
const NOVELTY =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|ralph|junior|kathy|deranged|hysterical|pipe/i;

function pickVoice(): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en") && !NOVELTY.test(v.name));
  const us = english.filter((v) => v.lang.replace("_", "-").toLowerCase() === "en-us");
  const pool = us.length > 0 ? us : english;
  return pool.find((v) => v.default) ?? pool.find((v) => v.localService) ?? pool[0] ?? null;
}

export interface SpeakHandlers {
  /** Word boundary, with the character index into the text. */
  onBoundary: (charIndex: number) => void;
  onEnd: () => void;
  /** The voice could not play (for example, blocked without a user gesture). */
  onError: () => void;
}

/**
 * Speaks the text, cancelling anything still playing. Must be reached from a
 * user gesture: Chrome blocks speech otherwise. Returns false with no voice support.
 */
export function speak(text: string, handlers: SpeakHandlers): boolean {
  if (!canSpeak()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-US";
  u.rate = 1.0;
  u.pitch = 1.05;
  u.volume = 1;
  u.onboundary = (e) => handlers.onBoundary(e.charIndex);
  u.onend = () => handlers.onEnd();
  u.onerror = () => handlers.onError();
  synth.speak(u);
  return true;
}

export function cancelSpeech(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/* ---------- Recognition ---------- */

export interface ListenHandlers {
  /** Interim and final transcript so far. */
  onTranscript: (text: string) => void;
  /** Recognition ended; `text` is what was heard (may be empty). */
  onEnd: (text: string) => void;
  onDenied: () => void;
}

export interface Listener {
  stop: () => void;
  abort: () => void;
}

/** One utterance, en-US, with interim results. The audio is never stored by the app. */
export function listen(handlers: ListenHandlers): Listener | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  let heard = "";
  let aborted = false;
  rec.onresult = (e) => {
    heard = Array.from(e.results, (r) => r[0].transcript).join(" ").trim();
    handlers.onTranscript(heard);
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") handlers.onDenied();
  };
  rec.onend = () => {
    if (!aborted) handlers.onEnd(heard);
  };
  try {
    rec.start();
  } catch {
    return null;
  }
  return {
    stop: () => rec.stop(),
    abort: () => {
      aborted = true;
      rec.abort();
    },
  };
}
