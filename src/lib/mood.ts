/**
 * Mood check-in: five self-chosen options. Presentation only, never clinical.
 * It does not feed triage.ts, the readiness score or any threshold, and it is
 * not the simulated "Mood" reading in thresholds.json.
 *
 * PRIVACY INVARIANT: the check-in lives in session memory (useMoodStore) and
 * never enters a data packet or any consent option. ESLint keeps this module
 * and its store out of src/lib/packet.ts (eslint.config.mjs).
 */
export const MOODS = [
  { id: "great", label: "Great" },
  { id: "good", label: "Good" },
  { id: "okay", label: "Okay" },
  { id: "low", label: "Low" },
  { id: "very_low", label: "Very low" },
] as const;

export type MoodId = (typeof MOODS)[number]["id"];

/** "Low" and "Very low" switch the Time capsule to its low-mood view. */
export const isLow = (mood: MoodId | null): boolean => mood === "low" || mood === "very_low";
