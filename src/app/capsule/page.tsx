"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/capsule/ConfirmDialog";
import { Lightbox } from "@/components/capsule/Lightbox";
import { Tile } from "@/components/capsule/Tile";
import { Button } from "@/components/ds";
import type { CapsuleItem, ItemKind } from "@/lib/capsule/types";
import { isDemoUrl, useDemo } from "@/lib/useDemo";
import { useCapsuleStore } from "@/store/useCapsuleStore";

const ACCEPT = "image/*,video/*,audio/*";
type Filter = { by: "all" } | { by: "kind"; kind: ItemKind } | { by: "sender"; sender: string };
const KIND_FILTERS: readonly { kind: ItemKind; label: string }[] = [
  { kind: "video", label: "Videos" },
  { kind: "photo", label: "Photos" },
  { kind: "note", label: "Notes" },
];

const same = (a: Filter, b: Filter) => JSON.stringify(a) === JSON.stringify(b);

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex h-9 items-center rounded-pill border border-rule px-4 text-sm text-slate outline-none transition-colors duration-150 hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-cyan aria-pressed:border-cyan-line aria-pressed:bg-cyan-soft aria-pressed:text-cream"
    >
      {children}
    </button>
  );
}

export default function CapsulePage() {
  const demo = useDemo();
  const { status, items, init, addFiles, deleteItem, markSeen } = useCapsuleStore();
  const [filter, setFilter] = useState<Filter>({ by: "all" });
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  /** Order frozen when the viewer opens, so marking an item seen never reshuffles it. */
  const [session, setSession] = useState<readonly string[]>([]);
  const [confirm, setConfirm] = useState<CapsuleItem | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Mode comes from the URL itself, not the hydration snapshot, so ?demo=1 never touches IndexedDB.
  useEffect(() => {
    void init(isDemoUrl() ? "demo" : "device");
  }, [init]);

  const senders = [...new Set(items.map((i) => i.sender))].sort();
  const shown = items
    .filter((i) =>
      filter.by === "all" ? true : filter.by === "kind" ? i.kind === filter.kind : i.sender === filter.sender,
    )
    .sort((a, b) => b.addedAt - a.addedAt);
  // Featured: the most recent message not yet seen. It leads the grid.
  const featured = shown.find((i) => !i.seen) ?? null;
  const ordered = featured ? [featured, ...shown.filter((i) => i !== featured)] : shown;
  const unseen = items.filter((i) => !i.seen).length;

  const viewerItems = session
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is CapsuleItem => i !== undefined);

  const show = (index: number | null, list: readonly CapsuleItem[]) => {
    setOpenIndex(index === null || list.length === 0 ? null : Math.min(index, list.length - 1));
    const item = index === null ? null : list[index];
    if (item) void markSeen(item.id);
  };
  const open = (index: number) => {
    setSession(ordered.map((i) => i.id));
    show(index, ordered);
  };

  const add = async (files: readonly File[]) => {
    const n = await addFiles(files);
    const skipped = files.length - n;
    setNotice(skipped > 0 ? `${skipped} file${skipped === 1 ? "" : "s"} skipped: only photos, videos and audio.` : null);
  };

  return (
    <main
      data-dragging={dragging || undefined}
      className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-6 py-8 lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:flex-none lg:px-12 data-[dragging]:outline-2 data-[dragging]:-outline-offset-8 data-[dragging]:outline-cyan-line data-[dragging]:outline-dashed"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void add(Array.from(e.dataTransfer.files));
      }}
    >
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-light text-cream">Time capsule</h1>
          <p className="mt-3 flex items-center gap-3 text-sm text-slate">
            <span>
              <span className="font-mono text-cream">{items.length}</span> messages
            </span>
            {unseen > 0 && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-coral" />
                <span className="font-mono text-cream">{unseen}</span> new
              </span>
            )}
          </p>
        </div>
        <Button variant="primary" onClick={() => input.current?.click()}>
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          Add files
        </Button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void add(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </header>

      <div role="group" aria-label="Filter" className="mt-8 flex flex-wrap items-center gap-2">
        <Chip active={same(filter, { by: "all" })} onClick={() => setFilter({ by: "all" })}>
          All
        </Chip>
        {KIND_FILTERS.map((k) => (
          <Chip key={k.kind} active={same(filter, { by: "kind", kind: k.kind })} onClick={() => setFilter({ by: "kind", kind: k.kind })}>
            {k.label}
          </Chip>
        ))}
        {senders.length > 1 && (
          <>
            <span aria-hidden="true" className="mx-2 h-5 w-px bg-slate/40" />
            {senders.map((s) => (
              <Chip key={s} active={same(filter, { by: "sender", sender: s })} onClick={() => setFilter({ by: "sender", sender: s })}>
                {s}
              </Chip>
            ))}
          </>
        )}
      </div>

      {notice && (
        <p className="mt-4 text-sm text-amber" role="status">
          {notice}
        </p>
      )}

      <section aria-label="Messages" className="mt-6 min-h-0 flex-1 overflow-y-auto pb-2">
        {status === "error" ? (
          <p className="text-cream/80">This browser blocked local storage, so the capsule cannot open here.</p>
        ) : status === "ready" && items.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="flex flex-col items-center gap-4">
              <p className="text-cream/80">Nothing here yet.</p>
              <Button variant="primary" onClick={() => input.current?.click()}>
                Add files
              </Button>
            </div>
          </div>
        ) : (
          <ul className="grid auto-rows-[168px] grid-cols-1 gap-4 [grid-auto-flow:dense] sm:grid-cols-4 xl:grid-cols-6">
            {ordered.map((item, i) => (
              <Tile key={item.id} item={item} featured={item === featured} onOpen={() => open(i)} />
            ))}
          </ul>
        )}
      </section>

      <p className="pt-4 text-xs text-slate">
        Stored on this device only{demo ? " · demo entries, nothing is saved" : ""}
      </p>

      <Lightbox items={viewerItems} index={openIndex} onIndexChange={(i) => show(i, viewerItems)} onDelete={(item) => setConfirm(item)} />
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete ${confirm?.name ?? "message"}?`}
        description="It will be removed from this device."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!confirm) return;
          void deleteItem(confirm.id);
          setOpenIndex(null);
        }}
      />
    </main>
  );
}
