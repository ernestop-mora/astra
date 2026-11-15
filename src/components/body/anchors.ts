/**
 * Body zones in the shared body frame (y -1 feet to 1 head top, z toward the
 * front). Position sits on the skin; normal points out of it and decides
 * whether the zone faces the camera. Both are measured on the model itself by
 * tools/convert-body.py, so they move with it whenever the model is rebuilt.
 */
import type { Vec3 } from "./geometry";
import { ZONE_SURFACE } from "./model.generated";

export const ANCHOR_IDS = ["head", "heart", "torso", "abdomen"] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export interface Anchor {
  position: Vec3;
  normal: Vec3;
  label: string;
}

export const ANCHORS: Record<AnchorId, Anchor> = {
  head: { ...ZONE_SURFACE.head, label: "Head" },
  heart: { ...ZONE_SURFACE.heart, label: "Heart" },
  torso: { ...ZONE_SURFACE.torso, label: "Torso" },
  abdomen: { ...ZONE_SURFACE.abdomen, label: "Abdomen" },
};

export function isAnchorId(v: string | null): v is AnchorId {
  return v !== null && (ANCHOR_IDS as readonly string[]).includes(v);
}

/** Screen position of a zone, plus how much it faces the camera (-1 to 1). */
export interface AnchorScreen {
  x: number;
  y: number;
  facing: number;
}
export type AnchorFrame = Record<AnchorId, AnchorScreen>;

/**
 * Renderer-to-tags channel. A renderer publishes where each zone is on screen;
 * the tag layer subscribes. Neither knows about the other.
 */
export interface AnchorBus {
  publish: (frame: AnchorFrame) => void;
  subscribe: (fn: (frame: AnchorFrame) => void) => () => void;
}

export function createAnchorBus(): AnchorBus {
  let last: AnchorFrame | null = null;
  const subs = new Set<(frame: AnchorFrame) => void>();
  return {
    publish(frame) {
      last = frame;
      subs.forEach((fn) => fn(frame));
    },
    subscribe(fn) {
      subs.add(fn);
      if (last) fn(last);
      return () => {
        subs.delete(fn);
      };
    },
  };
}
