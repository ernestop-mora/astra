"use client";

import { AudioLines, Image as ImageIcon, Play, StickyNote, Video } from "lucide-react";
import { formatDuration, type CapsuleItem, type ItemKind } from "@/lib/capsule/types";
import { useItemUrl } from "./useItemImage";

export const KIND_ICON: Record<ItemKind, typeof Video> = {
  video: Video,
  photo: ImageIcon,
  audio: AudioLines,
  note: StickyNote,
};

/** Grid footprint by kind; the featured tile is always the large one. */
const SIZE: Record<ItemKind, string> = {
  video: "sm:col-span-2",
  photo: "sm:row-span-2",
  audio: "",
  note: "sm:col-span-2",
};

interface TileProps {
  item: CapsuleItem;
  featured: boolean;
  onOpen: () => void;
}

/**
 * One message. Surfaces come from the palette: navy layers for media, amber for
 * notes, cream for the featured unseen message. Only the user's own photos and
 * the locally drawn first frame of their own videos are ever shown as pictures.
 */
export function Tile({ item, featured, onOpen }: TileProps) {
  const Icon = KIND_ICON[item.kind];
  const { url } = useItemUrl(item.demo ? null : item, item.kind === "photo" ? "file" : "thumb");
  const picture = url !== null && (item.kind === "photo" || item.kind === "video");
  const note = item.kind === "note";
  const tone = featured ? "light" : note ? "amber" : "dark";

  return (
    <li className={featured ? "sm:col-span-3 sm:row-span-2" : SIZE[item.kind]}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${item.name}, ${item.kind} from ${item.sender}${item.seen ? "" : ", new"}`}
        className={`group relative flex h-full min-h-[150px] w-full flex-col overflow-hidden rounded-panel p-5 text-left outline-none transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-cyan active:scale-[.99] ${
          tone === "light" ? "surface-light" : tone === "amber" ? "bg-amber text-navy" : "surface text-cream hover:border-cyan/40"
        }`}
      >
        {picture && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- the user's own local file */}
            <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
          </>
        )}

        <span className="relative flex items-center justify-between">
          <span
            className={`grid size-9 place-items-center rounded-full ${
              tone === "dark" ? "bg-navy/60 text-cyan" : "bg-navy/10 text-navy"
            }`}
          >
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
          </span>
          {!item.seen && <span aria-hidden="true" className="size-2.5 rounded-full bg-coral" />}
        </span>

        {item.kind === "video" && picture && (
          <span aria-hidden="true" className="relative m-auto grid size-12 place-items-center rounded-full bg-navy/60 text-cream">
            <Play size={20} strokeWidth={1.5} />
          </span>
        )}

        {note && item.note && (
          <span className={`relative mt-4 shrink-0 text-sm leading-snug ${featured ? "line-clamp-4 text-lg" : "truncate"}`}>{item.note}</span>
        )}

        <span className="relative mt-auto pt-6">
          <span className={`block font-medium leading-tight ${featured ? "text-3xl font-light" : "text-base"}`}>
            {item.name}
          </span>
          <span className={`mt-1.5 flex flex-wrap items-center gap-x-2 text-xs ${tone === "dark" ? "text-cream/60" : "text-navy/70"}`}>
            <span>{item.sender}</span>
            {item.durationSec !== null && <span className="font-mono">{formatDuration(item.durationSec)}</span>}
            <span>{item.sentLabel}</span>
          </span>
        </span>
      </button>
    </li>
  );
}
