"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithRef } from "react";
import type { ForceState } from "./states";

/** light: for cream surfaces (navy text). */
type Variant = "primary" | "quiet" | "light";

interface ButtonProps extends Omit<ComponentPropsWithRef<typeof BaseButton>, "className"> {
  /** One primary per view: the filled pill. Everything else is quiet. */
  variant?: Variant;
  force?: ForceState;
  className?: string;
}

const BASE =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill border px-5 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,transform] duration-150 select-none " +
  "data-[force=focus]:outline-2 data-[force=focus]:outline-solid data-[force=focus]:outline-offset-2 data-[force=focus]:outline-cyan " +
  "active:scale-[.98] data-[force=pressed]:scale-[.98] " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[disabled]:active:scale-100";

const VARIANTS: Record<Variant, string> = {
  // Filled cyan with navy text (8.4:1): the main action of the view.
  primary:
    "border-cyan bg-cyan text-navy hover:bg-cream hover:border-cream data-[force=hover]:bg-cream data-[force=hover]:border-cream data-[disabled]:hover:border-cyan data-[disabled]:hover:bg-cyan",
  quiet:
    "border-control bg-transparent text-cream hover:border-cream hover:bg-cream/5 data-[force=hover]:border-cream data-[force=hover]:bg-cream/5 data-[disabled]:hover:border-control data-[disabled]:hover:bg-transparent",
  light:
    "border-navy/60 bg-transparent text-navy hover:border-navy hover:bg-navy/5 data-[force=hover]:border-navy data-[force=hover]:bg-navy/5 focus-visible:outline-navy data-[force=focus]:outline-navy data-[disabled]:hover:border-navy/60 data-[disabled]:hover:bg-transparent",
};

/** Pill button, 40 px. Pressed scales to .98; focus is a 2 px cyan ring. */
export function Button({ variant = "quiet", force, className = "", ...props }: ButtonProps) {
  return <BaseButton data-force={force} className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
