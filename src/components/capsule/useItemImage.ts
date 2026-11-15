"use client";

import { useEffect, useState } from "react";
import type { CapsuleItem } from "@/lib/capsule/types";
import { useCapsuleStore } from "@/store/useCapsuleStore";

/**
 * Object URL for one of the user's own files, read from this device.
 * "file" is the original; "thumb" is the locally drawn first frame of a video.
 * Demo entries and notes never have one. Revoked when no longer shown.
 */
export function useItemUrl(item: CapsuleItem | null, which: "file" | "thumb"): { url: string | null; missing: boolean } {
  const readBlob = useCapsuleStore((s) => s.readBlob);
  const readThumb = useCapsuleStore((s) => s.readThumb);
  const [state, setState] = useState<{ key: string; url: string | null } | null>(null);
  const key = item ? `${item.id}:${which}` : null;

  useEffect(() => {
    if (!item || item.demo || item.kind === "note") return;
    if (which === "thumb" && item.kind !== "video") return;
    let url: string | null = null;
    let live = true;
    (which === "file" ? readBlob(item.id) : readThumb(item.id)).then((blob) => {
      if (!live) return;
      url = blob ? URL.createObjectURL(blob) : null;
      setState({ key: `${item.id}:${which}`, url });
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item, which, readBlob, readThumb]);

  const current = state && state.key === key ? state : null;
  return { url: current?.url ?? null, missing: current !== null && current.url === null };
}
