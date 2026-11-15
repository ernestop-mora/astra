/**
 * Body zones in the shared body frame (y -1 feet to 1 head top, z toward the
 * front). Position sits on the surface; normal points out of it and decides
 * whether the zone faces the camera. Calibrated by capture against the placeholder figure:
 * recalibrate when public/models/body.glb is added.
 */
import type { Vec3 } from "./geometry";

export const ANCHOR_IDS = ["head", "heart", "torso", "abdomen"] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export interface Anchor {
  position: Vec3;
  normal: Vec3;
  label: string;
}

export const ANCHORS: Record<AnchorId, Anchor> = {
  head: { position: [0, 0.855, 0.12], normal: [0, 0.15, 1], label: "Head" },
  heart: { position: [0.025, 0.37, 0.112], normal: [0.05, 0, 1], label: "Heart" },
  torso: { position: [-0.1, 0.3, 0.112], normal: [-0.1, 0, 1], label: "Torso" },
  abdomen: { position: [0.06, 0.14, 0.102], normal: [0.05, 0, 1], label: "Abdomen" },
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
