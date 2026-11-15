/**
 * ?demo=1 content: metadata only. No image, video or audio exists for these
 * entries, here or anywhere in the repository. Labels and times are fixed.
 */
import type { CapsuleItem } from "./types";

const FROM_EARTH = "Sent from Earth, 22 min ago";
const BEFORE_LAUNCH = "Sent before launch";

const entry = (
  id: string,
  name: string,
  kind: CapsuleItem["kind"],
  sender: string,
  sentLabel: string,
  addedAt: number,
  extra: Partial<CapsuleItem> = {},
): CapsuleItem => ({
  id,
  name,
  kind,
  durationSec: null,
  sender,
  sentLabel,
  seen: true,
  addedAt,
  mime: null,
  note: null,
  demo: true,
  ...extra,
});

export const DEMO_ITEMS: CapsuleItem[] = [
  entry("d1", "Birthday message", "video", "Family member", FROM_EARTH, 12, { durationSec: 42, seen: false }),
  entry("d2", "Questions about space", "video", "Child", FROM_EARTH, 11, { durationSec: 75, seen: false }),
  entry("d3", "Sunday plans", "note", "Family member", FROM_EARTH, 10, {
    seen: false,
    note: "We are all home on Sunday and will call at the usual time. Sleep well before the walk.",
  }),
  entry("d4", "Day 200 congratulations", "video", "Flight director", BEFORE_LAUNCH, 9, { durationSec: 58 }),
  entry("d5", "Garden in spring", "photo", "Family member", BEFORE_LAUNCH, 8),
  entry("d6", "Drawing of the station", "photo", "Child", BEFORE_LAUNCH, 7),
  entry("d7", "Bedtime story", "audio", "Family member", BEFORE_LAUNCH, 6, { durationSec: 370 }),
  entry("d8", "Weekend schedule", "note", "Mission control", BEFORE_LAUNCH, 5, {
    note: "Saturday is a rest day. Exercise moves to 16:00. Family call window opens at 18:30.",
  }),
  entry("d9", "Team dinner", "photo", "Friend", BEFORE_LAUNCH, 4),
  entry("d10", "Launch day crowd", "video", "Friend", BEFORE_LAUNCH, 3, { durationSec: 31 }),
];
