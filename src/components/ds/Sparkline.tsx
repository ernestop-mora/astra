interface SparklineProps {
  values: readonly number[];
  /** In-range band, shaded behind the line */
  band: readonly [number, number];
  /** Colour of the last point: the current state */
  stateColor: string;
  width?: number | string;
  height: number;
  className?: string;
  label?: string;
}

const VB_W = 100;

/** 24-hour line in cyan over the shaded in-range band; the last point carries the state. */
export function Sparkline({ values, band, stateColor, width = 48, height, className = "", label }: SparklineProps) {
  const lo = Math.min(band[0], ...values);
  const hi = Math.max(band[1], ...values);
  const pad = (hi - lo) * 0.12 || 1;
  const min = lo - pad;
  const max = hi + pad;
  const y = (v: number) => height - ((v - min) / (max - min)) * height;
  const x = (i: number) => (i / (values.length - 1)) * VB_W;
  const points = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  const last = values.length - 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${height}`}
      preserveAspectRatio="none"
      className={`overflow-visible ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <rect x={0} y={y(band[1])} width={VB_W} height={Math.max(1, y(band[0]) - y(band[1]))} fill="var(--cyan)" opacity={0.12} />
      <polyline
        points={points}
        fill="none"
        stroke="var(--cyan)"
        strokeWidth={1.25}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* Zero-length round-capped line: a true circle even when the SVG stretches */}
      <line
        x1={x(last)}
        y1={y(values[last])}
        x2={x(last)}
        y2={y(values[last])}
        stroke={stateColor}
        strokeWidth={5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
