/**
 * Time capsule state. Kept apart from useAppStore on purpose: capsule content
 * never reaches the data packet or consent (see src/lib/capsule/types.ts).
 */
import { create } from "zustand";
import { createDemoRepo, createDeviceRepo, type CapsuleRepo } from "@/lib/capsule/repo";
import { kindFromMime, type CapsuleItem } from "@/lib/capsule/types";

type Mode = "demo" | "device";

interface CapsuleState {
  mode: Mode | null;
  status: "idle" | "loading" | "ready" | "error";
  items: CapsuleItem[];
  init: (mode: Mode) => Promise<void>;
  addFiles: (files: readonly File[]) => Promise<number>;
  deleteItem: (id: string) => Promise<void>;
  markSeen: (id: string) => Promise<void>;
  readBlob: (id: string) => Promise<Blob | null>;
  readThumb: (id: string) => Promise<Blob | null>;
}

let repo: CapsuleRepo | null = null;
const need = (): CapsuleRepo => {
  if (!repo) throw new Error("Capsule not initialised");
  return repo;
};

interface MediaMeta {
  duration: number | null;
  /** First frame, for videos: drawn locally from the user's own file. */
  thumb: Blob | null;
}

function readMediaMeta(file: File): Promise<MediaMeta> {
  return new Promise((resolve) => {
    const isVideo = file.type.startsWith("video/");
    const el = document.createElement(isVideo ? "video" : "audio");
    const url = URL.createObjectURL(file);
    let duration: number | null = null;
    let settled = false;
    const finish = (thumb: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve({ duration, thumb });
    };
    const timer = window.setTimeout(() => finish(null), 8000);
    el.muted = true;
    el.preload = isVideo ? "auto" : "metadata";
    el.onerror = () => finish(null);
    el.onloadedmetadata = () => {
      duration = Number.isFinite(el.duration) ? el.duration : null;
      if (!isVideo) {
        window.clearTimeout(timer);
        finish(null);
        return;
      }
      el.currentTime = Math.min(0.1, (duration ?? 0) / 2);
    };
    if (el instanceof HTMLVideoElement) {
      el.onseeked = () => {
        const w = Math.min(640, el.videoWidth || 640);
        const h = Math.round(w * ((el.videoHeight || 9) / (el.videoWidth || 16)));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(el, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            window.clearTimeout(timer);
            finish(blob);
          },
          "image/jpeg",
          0.8,
        );
      };
    }
    el.src = url;
  });
}

export const useCapsuleStore = create<CapsuleState>()((set, get) => ({
  mode: null,
  status: "idle",
  items: [],

  async init(mode) {
    if (get().mode === mode && get().status !== "error") return;
    repo = mode === "demo" ? createDemoRepo() : createDeviceRepo();
    set({ mode, status: "loading" });
    try {
      set({ items: await need().load(), status: "ready" });
    } catch {
      set({ status: "error" });
    }
  },

  async addFiles(files) {
    const added: CapsuleItem[] = [];
    for (const file of files) {
      const kind = kindFromMime(file.type);
      if (!kind || kind === "note") continue;
      const meta = kind === "photo" ? { duration: null, thumb: null } : await readMediaMeta(file);
      const item: CapsuleItem = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ""),
        kind,
        durationSec: meta.duration,
        sender: "You",
        sentLabel: "Added on this device",
        seen: false,
        addedAt: Date.now(),
        mime: file.type,
        note: null,
        demo: false,
      };
      await need().saveBlob(item.id, file);
      if (meta.thumb) await need().saveThumb(item.id, meta.thumb);
      await need().saveItem(item);
      added.push(item);
    }
    set((s) => ({ items: [...s.items, ...added] }));
    return added.length;
  },

  async deleteItem(id) {
    await need().removeItem(id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  async markSeen(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item || item.seen) return;
    const next = { ...item, seen: true };
    await need().saveItem(next);
    set((s) => ({ items: s.items.map((i) => (i.id === id ? next : i)) }));
  },

  readBlob: (id) => need().readBlob(id),
  readThumb: (id) => need().readThumb(id),
}));
