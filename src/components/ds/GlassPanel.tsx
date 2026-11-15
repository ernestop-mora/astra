import type { ComponentPropsWithRef } from "react";

interface GlassPanelProps extends ComponentPropsWithRef<"div"> {
  /** Only the side panel is elevated: the one shadow in the system. */
  elevated?: boolean;
}

/** Glass surface: translucent navy, 1 px cream border, 18 px blur, inner highlight, radius 14. */
export function GlassPanel({ elevated = false, className = "", ...props }: GlassPanelProps) {
  return (
    <div
      className={`glass rounded-panel ${elevated ? "shadow-[var(--panel-shadow),var(--glass-highlight)]" : ""} ${className}`}
      {...props}
    />
  );
}
