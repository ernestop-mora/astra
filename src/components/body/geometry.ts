/**
 * Shared body frame. Units: the body spans y = -1 (feet) to y = 1 (head top),
 * x to the viewer's right, z toward the viewer. Every renderer (WebGL, SVG)
 * and the tag layer use this same frame, so renderers are swappable.
 */

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];


export type BodyPart =
  | { kind: "sphere"; c: Vec3; r: number }
  | { kind: "capsule"; a: Vec3; b: Vec3; r: number }
  | { kind: "block"; c: Vec3; w: number; h: number; d: number; radius: number };

/**
 * PLACEHOLDER figure built from primitives. Used only while public/models/body.glb
 * is missing, and as the source of the flat SVG fallback silhouette.
 */
const CENTER: BodyPart[] = [
  { kind: "sphere", c: [0, 0.82, 0], r: 0.125 },
  { kind: "capsule", a: [0, 0.62, 0], b: [0, 0.7, 0], r: 0.05 },
  { kind: "block", c: [0, 0.38, 0], w: 0.44, h: 0.42, d: 0.22, radius: 0.1 },
  { kind: "block", c: [0, 0.06, 0], w: 0.36, h: 0.3, d: 0.2, radius: 0.1 },
];

const LIMBS_RIGHT: BodyPart[] = [
  { kind: "capsule", a: [0.25, 0.53, 0], b: [0.31, 0.2, 0], r: 0.055 },
  { kind: "capsule", a: [0.31, 0.2, 0], b: [0.34, -0.12, 0.02], r: 0.045 },
  { kind: "sphere", c: [0.345, -0.2, 0.02], r: 0.05 },
  { kind: "capsule", a: [0.1, -0.1, 0], b: [0.12, -0.52, 0], r: 0.08 },
  { kind: "capsule", a: [0.12, -0.52, 0], b: [0.12, -0.9, 0], r: 0.06 },
  { kind: "capsule", a: [0.12, -0.95, 0.0], b: [0.12, -0.95, 0.09], r: 0.04 },
];

const mirror = (p: BodyPart): BodyPart => {
  const m = (v: Vec3): Vec3 => [-v[0], v[1], v[2]];
  if (p.kind === "sphere") return { ...p, c: m(p.c) };
  if (p.kind === "capsule") return { ...p, a: m(p.a), b: m(p.b) };
  return { ...p, c: m(p.c) };
};

export const BODY_PARTS: readonly BodyPart[] = [
  ...CENTER,
  ...LIMBS_RIGHT,
  ...LIMBS_RIGHT.map(mirror),
];

/** Fraction of stage height covered by one body unit (body is 2 units tall). */
export const BODY_SCALE = 0.46;

/** Pixels per body unit for a stage of the given height. */
export const pxPerUnit = (stageHeight: number): number => stageHeight * BODY_SCALE;

/** Project a body-frame point (front view) to stage pixels. */
export function toStage(p: Vec2 | Vec3, width: number, height: number): Vec2 {
  const k = pxPerUnit(height);
  return [width / 2 + p[0] * k, height / 2 - p[1] * k];
}
