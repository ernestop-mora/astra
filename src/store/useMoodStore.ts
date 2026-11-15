import { create } from "zustand";
import type { MoodId } from "@/lib/mood";

/**
 * Mood check-in state. Session memory only: nothing is persisted, sent or put
 * in a data packet (ESLint keeps this store out of src/lib/packet.ts). Nothing
 * here is detected: it is only what the person chose or typed.
 */
interface MoodStore {
  mood: MoodId | null;
  /** A crisis phrase was typed or spoken: the support card replaces the low-mood view. */
  crisis: boolean;
  /** Set from ?mood= so captures show the final state with no entrance motion. */
  frozen: boolean;
  setMood: (mood: MoodId | null, frozen?: boolean) => void;
  setCrisis: (on: boolean, frozen?: boolean) => void;
}

export const useMoodStore = create<MoodStore>()((set) => ({
  mood: null,
  crisis: false,
  frozen: false,
  setMood: (mood, frozen = false) => set({ mood, crisis: false, frozen }),
  setCrisis: (on, frozen = false) => set({ crisis: on, mood: null, frozen }),
}));
