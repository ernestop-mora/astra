"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ANCHORS } from "@/components/body/anchors";
import { ZoneContent } from "@/components/body/ZoneContent";
import { Button, GlassPanel } from "@/components/ds";
import { PacketContent } from "@/components/PacketContent";
import { useAppStore } from "@/store/useAppStore";

/**
 * Takes keyboard focus when it opens and hands it back when it closes, so the
 * panel is the next thing read and nothing behind it is focused. A consent
 * choice keeps focus on its radio: arrow keys keep moving through the options.
 */
function PanelFocus({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    if (before?.getAttribute("role") === "radio") return;
    box.current?.focus();
    return () => {
      if (before?.isConnected) before.focus();
    };
  }, []);
  return (
    <div ref={box} tabIndex={-1} className="flex flex-col outline-none">
      {children}
    </div>
  );
}

/**
 * The one side panel. Elevated glass: the only shadow in the system. Its bottom
 * padding keeps the last row clear of the floating assistant.
 */
export function SidePanel({ panelRef }: { panelRef: React.Ref<HTMLDivElement> }) {
  const panel = useAppStore((s) => s.panel);
  const close = useAppStore((s) => s.closePanel);
  const key = panel === null ? "none" : panel.kind === "zone" ? panel.zone : "packet";
  const title = panel === null ? "" : panel.kind === "zone" ? ANCHORS[panel.zone].label : "Privacy";

  return (
    <AnimatePresence>
      {panel && (
        <motion.div
          key={key}
          ref={panelRef}
          role="dialog"
          aria-labelledby="side-panel-title"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute top-0 right-0 z-20 flex min-h-full w-full max-w-[400px]"
        >
          {/* Denser than the base glass: readings behind it must not show through the text. */}
          <GlassPanel elevated className="w-full px-5 pt-4 pb-24" style={{ background: "color-mix(in srgb, var(--navy) 88%, transparent)" }}>
            <PanelFocus>
              <header className="mb-3 flex items-center justify-between gap-4">
                <h2 id="side-panel-title" className="text-lg font-medium text-cream">
                  {title}
                </h2>
                <Button variant="quiet" onClick={close}>
                  Close
                </Button>
              </header>
              {panel.kind === "zone" ? <ZoneContent key={panel.zone} zone={panel.zone} /> : <PacketContent />}
            </PanelFocus>
          </GlassPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
