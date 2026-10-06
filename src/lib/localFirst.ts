import {
  Timestamp,
  doc,
  getDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "./firebase";

/**
 * The local-first sync from SPEC.md §7, written once for any collection under
 * `users/{uid}` (the spec requires it to be collection-generic so M5's show
 * cards reuse it). M3 wires it to `savedPhrases` only.
 *
 * Logged out, items live in localStorage with `syncedFromLocal: false`. On
 * sign-in `uploadLocal` pushes them up, dedupes on the collection's key, lets
 * the newer `conflictField` win, marks uploads `syncedFromLocal: true`, then
 * clears local.
 */
export interface LocalFirstCollection<T extends { id: string; syncedFromLocal: boolean }> {
  /** Subcollection name under `users/{uid}`. */
  name: string;
  /** localStorage key used while logged out. */
  storageKey: string;
  /** Two items with the same key are the same item (SPEC.md §7 dedupe). */
  dedupeKey: (item: T) => string;
  /** Last write wins on this field (epoch ms). */
  conflictField: keyof T & string;
  /** Fields stored as Firestore `Timestamp` and held as epoch ms in the app. */
  timestampFields: readonly (keyof T & string)[];
}

export function readLocal<T extends { id: string; syncedFromLocal: boolean }>(
  collection: LocalFirstCollection<T>,
): T[] {
  try {
    const raw = window.localStorage.getItem(collection.storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // Private mode, blocked storage, or a corrupt value: behave as empty
    // rather than breaking every page that shows a save button.
    return [];
  }
}

export function writeLocal<T extends { id: string; syncedFromLocal: boolean }>(
  collection: LocalFirstCollection<T>,
  items: T[],
): boolean {
  try {
    if (items.length === 0) window.localStorage.removeItem(collection.storageKey);
    else window.localStorage.setItem(collection.storageKey, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

/**
 * Document id derived from the dedupe key, so the same phrase saved on two
 * devices lands on the same document instead of two. Hashed because a raw
 * `sourceText` can contain "/" (illegal in an id) and run past Firestore's
 * 1,500-byte id limit once multi-byte characters are encoded.
 */
export async function docIdFor(key: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function toRemote<T extends { id: string; syncedFromLocal: boolean }>(
  collection: LocalFirstCollection<T>,
  item: T,
): DocumentData {
  const data: DocumentData = { ...item };
  for (const field of collection.timestampFields) {
    data[field] = Timestamp.fromMillis(item[field] as number);
  }
  return data;
}

export function fromRemote<T extends { id: string; syncedFromLocal: boolean }>(
  collection: LocalFirstCollection<T>,
  data: DocumentData,
): T {
  const item: DocumentData = { ...data };
  for (const field of collection.timestampFields) {
    const value = data[field];
    item[field] = value instanceof Timestamp ? value.toMillis() : 0;
  }
  return item as T;
}

/** Firestore caps a batch at 500 writes; stay clear of it. */
const BATCH_LIMIT = 400;

/**
 * Upload logged-out items after sign-in. Throws if Firestore can't be
 * reached (e.g. signing in with no signal); local items are left in place so
 * the next sign-in retries. Idempotent: an item already uploaded has an equal
 * `conflictField` remotely and is skipped.
 */
export async function uploadLocal<T extends { id: string; syncedFromLocal: boolean }>(
  collection: LocalFirstCollection<T>,
  uid: string,
): Promise<void> {
  const local = readLocal(collection);
  const db = getDb();
  if (local.length === 0 || !db) return;

  let batch = writeBatch(db);
  let pending = 0;

  for (const item of local) {
    const id = await docIdFor(collection.dedupeKey(item));
    const ref = doc(db, "users", uid, collection.name, id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const remote = fromRemote(collection, existing.data());
      if ((remote[collection.conflictField] as number) >= (item[collection.conflictField] as number)) {
        continue;
      }
    }
    batch.set(ref, toRemote(collection, { ...item, id, syncedFromLocal: true }));
    pending += 1;
    if (pending === BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
  writeLocal(collection, []);
}
