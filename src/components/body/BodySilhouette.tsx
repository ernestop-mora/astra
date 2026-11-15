import { BODY_PARTS, pxPerUnit } from "./geometry";

interface BodySilhouetteProps {
  width: number;
  height: number;
}

/** Flat SVG fallback drawn from the same body spec as the 3D renderer. */
export function BodySilhouette({ width, height }: BodySilhouetteProps) {
  if (width === 0 || height === 0) return null;
  const k = pxPerUnit(height);
  const vw = width / k;
  const vh = height / k;
  // y is flipped: SVG grows downward, the body frame grows upward.
  const y = (v: number) => -v;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`${-vw / 2} ${-vh / 2} ${vw} ${vh}`}
      aria-hidden="true"
    >
      <g fill="var(--cream)" stroke="var(--cream)" opacity={0.85}>
        {BODY_PARTS.map((p, i) => {
          if (p.kind === "sphere") {
            return <circle key={i} cx={p.c[0]} cy={y(p.c[1])} r={p.r} stroke="none" />;
          }
          if (p.kind === "capsule") {
            return (
              <line
                key={i}
                x1={p.a[0]}
                y1={y(p.a[1])}
                x2={p.b[0]}
                y2={y(p.b[1])}
                strokeWidth={p.r * 2}
                strokeLinecap="round"
              />
            );
          }
          return (
            <rect
              key={i}
              x={p.c[0] - p.w / 2}
              y={y(p.c[1]) - p.h / 2}
              width={p.w}
              height={p.h}
              rx={p.radius}
              stroke="none"
            />
          );
        })}
      </g>
    </svg>
  );
}
