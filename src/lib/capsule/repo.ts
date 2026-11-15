/**
 * Where the capsule lives. The device repo uses IndexedDB in this browser only:
 * nothing is uploaded. The demo repo keeps everything in memory and never
 * touches IndexedDB.
 */
import { DEMO_ITEMS } from "./demo";
import type { CapsuleItem } from "./types";

export interface CapsuleRepo {
  load(): Promise<CapsuleItem[]>;
  saveItem(item: CapsuleItem): Promise<void>;
  removeItem(id: string): Promise<void>;
  saveBlob(id: string, blob: Blob): Promise<void>;
  readBlob(id: string): Promise<Blob | null>;
  /** First frame of a user's own video, made locally from that file. */
  saveThumb(id: string, blob: Blob): Promise<void>;
  readThumb(id: string): Promise<Blob | null>;
}

/* ---------- demo: in memory ---------- */

export function createDemoRepo(): CapsuleRepo {
  const blobs = new Map<string, Blob>();
  const thumbs = new Map<string, Blob>();
  return {
    load: async () => structuredClone(DEMO_ITEMS),
    saveItem: async () => {},
    removeItem: async (id) => {
      blobs.delete(id);
      thumbs.delete(id);
    },
    saveBlob: async (id, blob) => void blobs.set(id, blob),
    readBlob: async (id) => blobs.get(id) ?? null,
    saveThumb: async (id, blob) => void thumbs.set(id, blob),
    readThumb: async (id) => thumbs.get(id) ?? null,
  };
}

/* ---------- device: IndexedDB ---------- */

const DB_NAME = "astra-capsule";
/** v1 had folders; v2 is a flat gallery. */
const DB_VERSION = 2;
type StoreName = "items" | "blobs" | "thumbs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const tx = req.transaction;
      if (!db.objectStoreNames.contains("items")) db.createObjectStore("items", { keyPath: "id" });
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      if (!db.objectStoreNames.contains("thumbs")) db.createObjectStore("thumbs");
      // v1 -> v2: flatten. Every item is kept; only its folder is dropped.
      if (event.oldVersion < 2 && tx) {
        const cursorReq = tx.objectStore("items").openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) return;
          const { folderId: _dropped, ...flat } = cursor.value as CapsuleItem & { folderId?: string };
          void _dropped;
          cursor.update(flat);
          cursor.continue();
        };
        if (db.objectStoreNames.contains("folders")) db.deleteObjectStore("folders");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createDeviceRepo(): CapsuleRepo {
  const dbp = openDb();
  const write = async (stores: StoreName[], fn: (tx: IDBTransaction) => void) => {
    const db = await dbp;
    const tx = db.transaction(stores, "readwrite");
    fn(tx);
    await done(tx);
  };
  const readFrom = async (store: "blobs" | "thumbs", id: string) => {
    const db = await dbp;
    const blob = await request(db.transaction(store, "readonly").objectStore(store).get(id) as IDBRequest<Blob | undefined>);
    return blob ?? null;
  };

  return {
    async load() {
      const db = await dbp;
      return request(db.transaction("items", "readonly").objectStore("items").getAll() as IDBRequest<CapsuleItem[]>);
    },
    saveItem: (item) => write(["items"], (t) => void t.objectStore("items").put(item)),
    removeItem: (id) =>
      write(["items", "blobs", "thumbs"], (t) => {
        t.objectStore("items").delete(id);
        t.objectStore("blobs").delete(id);
        t.objectStore("thumbs").delete(id);
      }),
    saveBlob: (id, blob) => write(["blobs"], (t) => void t.objectStore("blobs").put(blob, id)),
    readBlob: (id) => readFrom("blobs", id),
    saveThumb: (id, blob) => write(["thumbs"], (t) => void t.objectStore("thumbs").put(blob, id)),
    readThumb: (id) => readFrom("thumbs", id),
  };
}
