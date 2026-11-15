"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { Button } from "@/components/ds";
import { formatDuration, type CapsuleItem } from "@/lib/capsule/types";
import { KIND_ICON } from "./Tile";
import { useItemUrl } from "./useItemImage";

interface LightboxProps {
  items: readonly CapsuleItem[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  onDelete: (item: CapsuleItem) => void;
}

/**
 * Cream viewer over a navy stage. Left and right arrows move through the
 * current filter; Escape or a click outside closes. Video never autoplays
 * and starts muted.
 */
export function Lightbox({ items, index, onIndexChange, onDelete }: LightboxProps) {
  const item = index === null ? null : (items[index] ?? null);
  const { url, missing } = useItemUrl(item, "file");
  const go = (step: number) => {
    if (index === null || items.length === 0) return;
    onIndexChange((index + step + items.length) % items.length);
  };
  const Icon = item ? KIND_ICON[item.kind] : null;

  return (
    <Dialog.Root open={item !== null} onOpenChange={(open) => !open && onIndexChange(null)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-navy/80" />
        <Dialog.Popup
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
          className="surface-light fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-48px)] w-[min(1120px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-panel p-5 outline-none small:overflow-y-auto"
        >
          {item && Icon && index !== null && (
            <>
              <header className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-navy/10">
                    <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <div>
                    <Dialog.Title className="text-lg font-medium text-navy">{item.name}</Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-navy">
                      {item.sender}
                      {item.durationSec !== null && (
                        <>
                          {" · "}
                          <span className="font-mono">{formatDuration(item.durationSec)}</span>
                        </>
                      )}
                      {" · "}
                      {item.sentLabel}
                    </Dialog.Description>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="light" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`}>
                    <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                    Delete
                  </Button>
                  <Dialog.Close render={<Button variant="light" aria-label="Close" className="w-10 !px-0" />}>
                    <X size={18} strokeWidth={1.5} aria-hidden="true" />
                  </Dialog.Close>
                </div>
              </header>

              <div className="relative mt-4 grid min-h-[min(50dvh,620px)] flex-1 place-items-center rounded-field bg-navy p-4 text-cream">
                {item.kind === "note" && item.note !== null ? (
                  <div className="max-w-2xl justify-self-start p-6">
                    <p className="text-md whitespace-pre-wrap">{item.note}</p>
                    {item.demo && <p className="mt-6 text-sm text-mute">Demo entry.</p>}
                  </div>
                ) : item.demo ? (
                  <p className="p-8 text-center text-md text-cream">Demo entry. Add your own file to play it.</p>
                ) : missing ? (
                  <p className="p-8 text-center text-cream">This file is no longer on this device.</p>
                ) : !url ? null : item.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL
                  <img src={url} alt={`${item.name}, photo from ${item.sender}`} className="max-h-[56dvh] max-w-full rounded-field object-contain" />
                ) : item.kind === "video" ? (
                  <video
                    src={url}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    aria-label={`${item.name}, video from ${item.sender}`}
                    className="max-h-[56dvh] max-w-full rounded-field"
                  />
                ) : (
                  <audio src={url} controls preload="metadata" aria-label={`${item.name}, audio from ${item.sender}`} className="w-full max-w-xl" />
                )}
              </div>

              <footer className="mt-4 flex items-center justify-between">
                <Button variant="light" onClick={() => go(-1)} aria-label="Previous" className="w-10 !px-0">
                  <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
                </Button>
                <span className="font-mono text-sm text-navy" aria-live="polite">
                  {index + 1} / {items.length}
                </span>
                <Button variant="light" onClick={() => go(1)} aria-label="Next" className="w-10 !px-0">
                  <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
                </Button>
              </footer>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
