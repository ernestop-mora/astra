"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useAssistantStore } from "@/store/useAssistantStore";
import { AssistantFace } from "./AssistantFace";
import { useAssistant } from "./AssistantProvider";

// The panel loads on first open, so it adds nothing to the initial route.
const AssistantPanel = dynamic(() => import("./AssistantPanel").then((m) => m.AssistantPanel), { ssr: false });

/** Floating assistant: a 64 px orb bottom right that opens the panel. */
export function AssistantBubble() {
  const open = useAssistantStore((s) => s.panelOpen);
  const { open: openPanel } = useAssistant();
  const button = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Closing the panel hands focus back to the bubble.
  useEffect(() => {
    if (wasOpen.current && !open) button.current?.focus();
    wasOpen.current = open;
  }, [open]);

  if (open) return <AssistantPanel />;

  return (
    <button
      ref={button}
      type="button"
      aria-label="Ask PURA"
      data-assistant-bubble=""
      onClick={openPanel}
      className="group fixed right-6 bottom-6 z-40 size-16 cursor-pointer rounded-full transition-transform duration-150 hover:scale-[1.04] focus-visible:outline-offset-4 active:scale-[.98]"
    >
      <AssistantFace state="idle" mouth="closed" size={64} compact />
      <span
        aria-hidden="true"
        className="glass pointer-events-none absolute top-1/2 right-full mr-4 -translate-y-1/2 rounded-pill px-3 py-1.5 text-xs whitespace-nowrap text-cream opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        Ask PURA
      </span>
    </button>
  );
}
