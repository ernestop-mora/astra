/**
 * Catalog support: forces a visual state so /ds can show hover, focus and
 * pressed side by side. Components map it to data-force and style
 * data-[force=...] exactly like the live pseudo-class.
 */
export type ForceState = "hover" | "focus" | "pressed";
