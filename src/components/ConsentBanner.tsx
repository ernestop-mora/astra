"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAppStore, type Consent } from "@/store/useAppStore";

const OPTIONS: readonly { value: Consent; label: string }[] = [
  { value: "private", label: "Private" },
  { value: "doctor", label: "My doctor only" },
  { value: "open", label: "Open NASA data" },
];

const DESCRIPTIONS: Record<Consent, string> = {
  private: "Readings stay on this device.",
  doctor: "Your flight surgeon sees today's readings.",
  open: "Anonymized readings join the NASA open research set.",
};

function isConsent(value: unknown): value is Consent {
  return OPTIONS.some((o) => o.value === value);
}

export function ConsentBanner() {
  const consent = useAppStore((s) => s.consent);
  const setConsent = useAppStore((s) => s.setConsent);

  return (
    <section
      aria-labelledby="consent-heading"
      className="flex flex-col gap-4 border-t border-border pt-6 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <h2 id="consent-heading" className="text-sm font-medium text-cream">
          Who sees your health data
        </h2>
        <p className="mt-1 text-sm font-light text-slate">{DESCRIPTIONS[consent]}</p>
      </div>
      <RadioGroup
        value={consent}
        onValueChange={(v: unknown) => {
          if (isConsent(v)) setConsent(v);
        }}
        aria-labelledby="consent-heading"
        className="flex w-auto flex-wrap gap-x-6 gap-y-3"
      >
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm text-cream">
            <RadioGroupItem value={o.value} />
            {o.label}
          </label>
        ))}
      </RadioGroup>
    </section>
  );
}
