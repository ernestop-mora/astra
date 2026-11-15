/**
 * Time capsule: messages, photos and videos from home, kept for the astronaut.
 *
 * PRIVACY INVARIANT: capsule content never leaves the device. It lives only in
 * this browser (IndexedDB), is never uploaded, never committed and never part of
 * a data packet or any consent option. ESLint enforces it: src/lib/packet.ts,
 * PacketContent and the app store cannot import anything from the capsule
 * (see eslint.config.mjs, "capsule-stays-on-device").
 */

export type ItemKind = "photo" | "video" | "audio" | "note";

export interface CapsuleItem {
  id: string;
  name: string;
  kind: ItemKind;
  /** Seconds, for video and audio */
  durationSec: number | null;
  sender: string;
  /** Fixed delivery label, e.g. "Sent before launch" */
  sentLabel: string;
  seen: boolean;
  addedAt: number;
  mime: string | null;
  /** Text body, for notes */
  note: string | null;
  /** Demo entries are metadata only: there is no file and no picture. */
  demo: boolean;
}

export function kindFromMime(mime: string): ItemKind | null {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
