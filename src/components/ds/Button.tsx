"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithRef } from "react";
import type { ForceState } from "./states";

/** light: for cream surfaces (navy text). */
type Variant = "primary" | "quiet" | "light";

interface ButtonProps extends Omit<ComponentPropsWithRef<typeof BaseButton>, "className"> {
  /** One primary per view. */
  variant?: Variant;
  force?: ForceState;
  className?: string;
}

const BASE =
  "inline-flex h-10 items-center justify-center gap-2 rounded-pill border px-5 text-sm text-cream outline-none transition-[background-color,border-color,transform] duration-150 select-none " +
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cyan data-[force=focus]:outline-2 data-[force=focus]:outline-solid data-[force=focus]:outline-offset-2 data-[force=focus]:outline-cyan " +
  "active:scale-[.98] data-[force=pressed]:scale-[.98] " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[disabled]:active:scale-100";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border-cyan/30 bg-cyan/8 hover:border-cyan/55 hover:bg-cyan/14 data-[force=hover]:border-cyan/55 data-[force=hover]:bg-cyan/14 data-[disabled]:hover:border-cyan/30 data-[disabled]:hover:bg-cyan/8",
  quiet:
    "border-rule bg-transparent hover:border-cream/30 hover:bg-cream/5 data-[force=hover]:border-cream/30 data-[force=hover]:bg-cream/5 data-[disabled]:hover:border-rule data-[disabled]:hover:bg-transparent",
  light:
    "!text-navy border-navy/25 bg-transparent hover:border-navy/50 hover:bg-navy/5 data-[force=hover]:border-navy/50 data-[force=hover]:bg-navy/5 focus-visible:outline-navy data-[disabled]:hover:border-navy/25 data-[disabled]:hover:bg-transparent",
};

/** Pill button, 40 px. Pressed scales to .98; focus is a 2 px cyan ring. */
export function Button({ variant = "primary", force, className = "", ...props }: ButtonProps) {
  return <BaseButton data-force={force} className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
