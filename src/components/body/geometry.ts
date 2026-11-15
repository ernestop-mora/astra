/**
 * Shared body frame. Units: the body spans y = -1 (feet) to y = 1 (head top),
 * x to the viewer's right, z toward the viewer. Every renderer (WebGL, SVG)
 * and the tag layer use this same frame, so renderers are swappable.
 */

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

/**
 * Fraction of stage height covered by one body unit (the body is 2 units tall).
 * Matches the 3D camera (28 degree lens at 5.4 units), so the flat silhouette
 * and the 3D model have the same size: about 74% of the stage height.
 */
export const BODY_SCALE = 0.372;

/** Pixels per body unit for a stage of the given height. */
export const pxPerUnit = (stageHeight: number): number => stageHeight * BODY_SCALE;

/** Project a body-frame point (front view) to stage pixels. */
export function toStage(p: Vec2 | Vec3, width: number, height: number): Vec2 {
  const k = pxPerUnit(height);
  // The camera looks at y = -0.02, so the body sits a touch above centre.
  return [width / 2 + p[0] * k, height / 2 - (p[1] + 0.02) * k];
}
