"use client";

import { AnimatePresence, motion } from "motion/react";
import { ANCHORS } from "@/components/body/anchors";
import { ZoneContent } from "@/components/body/ZoneContent";
import { Button, GlassPanel } from "@/components/ds";
import { PacketContent } from "@/components/PacketContent";
import { useAppStore } from "@/store/useAppStore";

/** The one side panel. Elevated glass: the only shadow in the system. */
export function SidePanel({ panelRef }: { panelRef: React.Ref<HTMLDivElement> }) {
  const panel = useAppStore((s) => s.panel);
  const close = useAppStore((s) => s.closePanel);
  const key = panel === null ? "none" : panel.kind === "zone" ? panel.zone : "packet";
  const title = panel === null ? "" : panel.kind === "zone" ? ANCHORS[panel.zone].label : "What leaves this device";

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
          className="absolute inset-y-0 right-0 z-20 w-full max-w-[400px]"
        >
          <GlassPanel elevated className="flex h-full flex-col overflow-y-auto px-6 py-4">
            <header className="mb-3 flex items-center justify-between gap-4">
              <h3 id="side-panel-title" className="text-lg font-medium text-cream">
                {title}
              </h3>
              <Button variant="quiet" onClick={close}>
                Close
              </Button>
            </header>
            {panel.kind === "zone" ? <ZoneContent key={panel.zone} zone={panel.zone} /> : <PacketContent />}
          </GlassPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
