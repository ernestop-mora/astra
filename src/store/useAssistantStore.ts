import { create } from "zustand";

export type AssistantState = "idle" | "listening" | "thinking" | "speaking";
export type MouthShape = "closed" | "small" | "wide" | "round";

/**
 * Assistant UI state. Session memory only: nothing here is persisted, and no
 * question, transcript or audio ever enters a data packet (ESLint keeps this
 * store out of src/lib/packet.ts).
 */
interface AssistantStore {
  assistantState: AssistantState;
  panelOpen: boolean;
  muted: boolean;
  /** The current answer, whole. */
  subtitle: string;
  /** How many of its words are on screen. */
  shownWords: number;
  /** False while the last subtitle fades out. */
  subtitleVisible: boolean;
  lastQuestion: string;
  /** Text field content; shows the interim transcript while listening. */
  draft: string;
  mouth: MouthShape;
  /** One-line privacy notice, shown the first time the microphone is used. */
  voiceNotice: boolean;
  micDenied: boolean;
  /** ?state= or ?mouth= pins the visuals for captures. */
  pinned: boolean;
  set: (patch: Partial<Omit<AssistantStore, "set">>) => void;
}

export const useAssistantStore = create<AssistantStore>()((set) => ({
  assistantState: "idle",
  panelOpen: false,
  muted: false,
  subtitle: "",
  shownWords: 0,
  subtitleVisible: true,
  lastQuestion: "",
  draft: "",
  mouth: "closed",
  voiceNotice: false,
  micDenied: false,
  pinned: false,
  set: (patch) => set(patch),
}));
