import { pxPerUnit } from "./geometry";
import { SILHOUETTE_ROWS } from "./model.generated";

interface BodySilhouetteProps {
  width: number;
  height: number;
}

const ROW = 2 / SILHOUETTE_ROWS.length;

/** One closed strip per covered span of each row, slightly overlapped so no seams show. */
const PATH = SILHOUETTE_ROWS.map((spans, i) => {
  const top = -(-1 + (i + 1) * ROW) - 0.002;
  let d = "";
  for (let s = 0; s < spans.length; s += 2) {
    d += `M${spans[s]} ${top.toFixed(4)}H${spans[s + 1]}v${(ROW + 0.004).toFixed(4)}H${spans[s]}Z`;
  }
  return d;
}).join("");

/**
 * Flat fallback, and the stand-in while the 3D model loads. It is the front
 * outline of the same model (tools/convert-body.py), in the same translucent cyan.
 */
export function BodySilhouette({ width, height }: BodySilhouetteProps) {
  if (width === 0 || height === 0) return null;
  const k = pxPerUnit(height);
  const vw = width / k;
  const vh = height / k;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`${-vw / 2} ${-vh / 2 - 0.02} ${vw} ${vh}`}
      aria-hidden="true"
    >
      <path d={PATH} fill="var(--cyan)" fillOpacity={0.16} />
    </svg>
  );
}
