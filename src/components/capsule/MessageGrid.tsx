"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CapsuleItem, ItemKind } from "@/lib/capsule/types";
import { useFit } from "@/lib/useFit";
import { Tile } from "./Tile";

const COLS = 6;
const GAP = 16;
/** Shortest row that still holds a tile's icon, title and sender, in rem so it grows with the text size. */
const MIN_ROW_REM = 9.5;

/** Grid footprint by kind, in cells: [columns, rows]. The featured tile is the large one. */
const SPAN: Record<ItemKind, readonly [number, number]> = {
  video: [2, 1],
  photo: [1, 2],
  audio: [1, 1],
  note: [2, 1],
};
const FEATURED: readonly [number, number] = [3, 2];

interface Placed {
  item: CapsuleItem;
  col: number;
  row: number;
  w: number;
  h: number;
}

/**
 * Splits the messages into pages that each fit `rows` rows, keeping their order:
 * every tile takes the first free spot, and what does not fit starts the next page.
 */
function paginate(items: readonly CapsuleItem[], featured: CapsuleItem | null, rows: number, minW: number): Placed[][] {
  const pages: Placed[][] = [];
  let rest = [...items];
  while (rest.length > 0) {
    const taken = Array.from({ length: rows }, () => Array<boolean>(COLS).fill(false));
    const page: Placed[] = [];
    const left: CapsuleItem[] = [];
    for (const item of rest) {
      const [wRaw, hRaw] = item === featured ? FEATURED : SPAN[item.kind];
      const h = Math.min(hRaw, rows);
      // A tall tile that loses its second row gets a second column instead.
      const w = Math.max(wRaw, hRaw > rows ? 2 : 1, minW);
      let spot: [number, number] | null = null;
      for (let r = 0; r + h <= rows && !spot; r++) {
        for (let c = 0; c + w <= COLS && !spot; c++) {
          let free = true;
          for (let y = r; y < r + h && free; y++) for (let x = c; x < c + w && free; x++) free = !taken[y][x];
          if (free) spot = [r, c];
        }
      }
      if (!spot) {
        left.push(item);
        continue;
      }
      for (let y = spot[0]; y < spot[0] + h; y++) for (let x = spot[1]; x < spot[1] + w; x++) taken[y][x] = true;
      page.push({ item, row: spot[0], col: spot[1], w, h });
    }
    if (page.length === 0) break;
    pages.push(page);
    rest = left;
  }
  return pages;
}

interface MessageGridProps {
  items: readonly CapsuleItem[];
  featured: CapsuleItem | null;
  onOpen: (item: CapsuleItem) => void;
}

const PAGER =
  "grid size-10 cursor-pointer place-items-center rounded-full border border-control text-cream transition-colors duration-150 hover:border-cyan hover:bg-cyan-soft disabled:cursor-not-allowed disabled:opacity-40";

/**
 * The gallery. On the one-screen layout it never scrolls: it shows the tiles
 * that fit the free height and pages through the rest. On small windows or at
 * 200% zoom it is a plain grid in the scrolling page.
 */
export function MessageGrid({ items, featured, onOpen }: MessageGridProps) {
  const fit = useFit();
  const box = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(3);
  /** With enlarged text a one-column tile is too narrow, so every tile takes two. */
  const [minW, setMinW] = useState(1);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el || !fit) return;
    const ro = new ResizeObserver(([entry]) => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setRows(Math.max(1, Math.floor((entry.contentRect.height + GAP) / (MIN_ROW_REM * rem + GAP))));
      setMinW(rem > 20 ? 2 : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  if (!fit) {
    return (
      <ul className="grid auto-rows-[minmax(10.5rem,auto)] grid-cols-1 gap-4 [grid-auto-flow:dense] sm:grid-cols-4">
        {items.map((item) => (
          <Tile key={item.id} item={item} featured={item === featured} onOpen={() => onOpen(item)} flow />
        ))}
      </ul>
    );
  }

  const pages = paginate(items, featured, rows, minW);
  const current = Math.min(page, pages.length - 1);
  const shown = pages[current] ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={box} className="min-h-0 flex-1">
        <ul
          className="grid h-full gap-4"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        >
          {shown.map(({ item, col, row, w, h }) => (
            <Tile
              key={item.id}
              item={item}
              featured={item === featured}
              onOpen={() => onOpen(item)}
              style={{ gridColumn: `${col + 1} / span ${w}`, gridRow: `${row + 1} / span ${h}` }}
            />
          ))}
        </ul>
      </div>
      {pages.length > 1 && (
        <nav aria-label="Pages of messages" className="flex items-center justify-center gap-3">
          <button type="button" aria-label="Previous page" className={PAGER} disabled={current === 0} onClick={() => setPage(current - 1)}>
            <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <span className="font-mono text-sm text-cream" aria-live="polite">
            <span className="sr-only">Page </span>
            {current + 1} / {pages.length}
          </span>
          <button
            type="button"
            aria-label="Next page"
            className={PAGER}
            disabled={current === pages.length - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
