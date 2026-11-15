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

/** Footprint in the flowing grid (small windows); the paged grid places tiles itself. */
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
  /** Flowing grid: the tile takes its footprint from its kind. */
  flow?: boolean;
  style?: React.CSSProperties;
}

/**
 * One message. Surfaces come from the palette: navy layers for media, amber for
 * notes, cream for the featured unseen message. Only the user's own photos and
 * the locally drawn first frame of their own videos are ever shown as pictures.
 */
export function Tile({ item, featured, onOpen, flow = false, style }: TileProps) {
  const Icon = KIND_ICON[item.kind];
  const { url } = useItemUrl(item.demo ? null : item, item.kind === "photo" ? "file" : "thumb");
  const picture = url !== null && (item.kind === "photo" || item.kind === "video");
  const note = item.kind === "note";
  const tone = featured ? "light" : note ? "amber" : "dark";

  return (
    <li className={`min-h-0 ${!flow ? "" : featured ? "sm:col-span-3 sm:row-span-2" : SIZE[item.kind]}`} style={style}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${item.name}, ${item.kind} from ${item.sender}${item.seen ? "" : ", new"}`}
        className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-panel p-4 text-left transition-transform duration-150 active:scale-[.99] ${
          tone === "light"
            ? "surface-light focus-visible:outline-cyan"
            : tone === "amber"
              ? "bg-amber text-navy"
              : "surface text-cream [--surface-border:var(--control-border)] hover:border-cyan"
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
            className={`grid size-8 shrink-0 place-items-center rounded-full ${
              tone === "dark" ? "bg-navy/60 text-cyan" : "bg-navy/10 text-navy"
            }`}
          >
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
          </span>
          {!item.seen && (
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-coral" />
              New
            </span>
          )}
        </span>

        {item.kind === "video" && picture && (
          <span aria-hidden="true" className="relative m-auto grid size-12 place-items-center rounded-full bg-navy/60 text-cream">
            <Play size={20} strokeWidth={1.5} />
          </span>
        )}

        {note && item.note && (
          <span className={`relative mt-2 min-h-0 text-sm ${featured ? "line-clamp-3" : "line-clamp-1"}`}>{item.note}</span>
        )}

        <span className="relative mt-auto pt-2">
          <span className={`block font-medium ${featured ? "text-xl" : "text-md"}`}>
            {item.name}
          </span>
          <span className={`flex flex-wrap items-center gap-x-2 text-xs ${tone === "dark" ? "text-mute" : "text-navy"}`}>
            <span>{item.sender}</span>
            {item.durationSec !== null && <span className="font-mono">{formatDuration(item.durationSec)}</span>}
            <span>{item.sentLabel}</span>
          </span>
        </span>
      </button>
    </li>
  );
}
