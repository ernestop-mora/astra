"use client";

import { MotionConfig } from "motion/react";

/** All motion animations follow the OS reduced-motion setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
