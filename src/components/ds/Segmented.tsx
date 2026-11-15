"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { motion } from "motion/react";
import { useId } from "react";
import type { ForceState } from "./states";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  disabled?: boolean;
  /** Catalog only: forces a state on one option. */
  force?: { value: T; state: ForceState };
  className?: string;
  /** Extra attributes on each option, e.g. to mark them as panel triggers. */
  itemProps?: Record<string, string>;
}

/** Pill segmented control with a sliding indicator. */
export function Segmented<T extends string>({
  options,
  value,
  onValueChange,
  disabled,
  force,
  className = "",
  itemProps,
  ...aria
}: SegmentedProps<T>) {
  const layoutId = useId();
  const isOption = (v: unknown): v is T => options.some((o) => o.value === v);

  return (
    <RadioGroup
      value={value}
      onValueChange={(v: unknown) => {
        if (isOption(v)) onValueChange(v);
      }}
      disabled={disabled}
      aria-label={aria["aria-label"]}
      className={`glass inline-flex flex-wrap rounded-pill p-1 [--surface-border:var(--control-border)] data-[disabled]:opacity-40 ${className}`}
    >
      {options.map((o) => (
        <Radio.Root
          key={o.value}
          value={o.value}
          data-force={force?.value === o.value ? force.state : undefined}
          {...itemProps}
          className="relative flex h-9 cursor-pointer items-center rounded-pill px-4 text-sm whitespace-nowrap text-mute transition-[color,transform] duration-150 select-none
            hover:text-cream data-[force=hover]:text-cream
            data-[force=focus]:outline-2 data-[force=focus]:outline-solid data-[force=focus]:outline-offset-2 data-[force=focus]:outline-cyan
            active:scale-[.98] data-[force=pressed]:scale-[.98]
            data-[checked]:font-medium data-[checked]:text-cream data-[disabled]:cursor-not-allowed data-[disabled]:hover:text-mute"
        >
          {value === o.value && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-pill border border-cyan bg-cyan-soft"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
