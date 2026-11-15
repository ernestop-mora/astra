/**
 * Sealed messages for the low-mood view: metadata and sample text only. There
 * is no real video or audio here or anywhere in the repository; playback is
 * simulated with a progress bar and sample captions.
 */

export interface Sealed {
  id: string;
  condition: string;
  by: string;
  sealedOn: string;
}

/** Shown in this order normally; the low-mood one moves to the centre. */
export const SEALED: readonly Sealed[] = [
  { id: "s-low", condition: "Open when you feel low", by: "Home", sealedOn: "14 Mar" },
  { id: "s-300", condition: "Open on day 300", by: "Mission control", sealedOn: "2 Feb" },
  { id: "s-bday", condition: "Open on your birthday", by: "Family member", sealedOn: "20 Jan" },
];

export const LOW_ID = "s-low";

export const VIDEO = {
  title: "A message from home",
  durationSec: 42,
  label: "Sealed 14 Mar by Home. Open when you feel low.",
  /** Sample captions: [start second, text]. Generic and kind; no names. */
  captions: [
    [0, "Hi. We recorded this on a quiet Sunday."],
    [6, "We're proud of you."],
    [12, "The garden is blooming."],
    [19, "The kettle still whistles every morning."],
    [26, "Everyone sends their love."],
    [33, "Rest when you can."],
    [38, "See you soon."],
  ] as const,
};

export const VOICE = {
  title: "Voice note",
  durationSec: 18,
  transcript: "Just wanted you to hear the rain on the window. It sounds like home. We're thinking of you. Sleep well up there.",
  /** Fixed bar heights (0 to 1) for the drawn waveform. */
  bars: [0.3, 0.5, 0.8, 0.45, 0.6, 0.9, 0.55, 0.35, 0.7, 1, 0.65, 0.4, 0.75, 0.5, 0.3, 0.6, 0.85, 0.45, 0.55, 0.7, 0.4, 0.25, 0.5, 0.65, 0.35, 0.2],
};

/** Paced breathing: 4 s in, 6 s out. */
export const BREATH = { inMs: 4000, outMs: 6000 };
