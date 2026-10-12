"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SavedPhrase, ShowCard, TripPack, UserSettings } from "@/lib/types";

/**
 * The on-device store (SPEC.md §7 "Local-first sync"). Every user-data write
 * lands here first; the network is only for sync.
 *
 * The database name is a fixed internal identifier, deliberately not derived
 * from `brand.name`: renaming the app must not orphan everyone's saved data.
 */
const DB_NAME = "phrasebook-local";
const DB_VERSION = 1;

/** Tables that sync row-by-row through the outbox. */
export type SyncedTable = "savedPhrases" | "showCards";
export type SyncedRow = { savedPhrases: SavedPhrase; showCards: ShowCard };

export interface OutboxEntry {
  /** `${table}:${rowId}` — one entry per row, so repeat edits coalesce. */
  key: string;
  table: SyncedTable;
  row: SavedPhrase | ShowCard;
}

interface LocalSchema extends DBSchema {
  savedPhrases: { key: string; value: SavedPhrase };
  showCards: { key: string; value: ShowCard };
  tripPacks: { key: string; value: TripPack };
  settings: { key: "settings"; value: UserSettings };
  outbox: { key: string; value: OutboxEntry };
  /** `cursor`: last pull's server time. `owner`: user id the data belongs to. */
  meta: { key: string; value: string };
}

let dbPromise: Promise<IDBPDatabase<LocalSchema>> | undefined;

export function localDb(): Promise<IDBPDatabase<LocalSchema>> {
  dbPromise ??= openDB<LocalSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("savedPhrases", { keyPath: "id" });
      db.createObjectStore("showCards", { keyPath: "id" });
      db.createObjectStore("tripPacks", { keyPath: "id" });
      db.createObjectStore("settings");
      db.createObjectStore("outbox", { keyPath: "key" });
      db.createObjectStore("meta");
    },
  });
  return dbPromise;
}

const CHANGE_EVENT = "local-data-changed";

/** Tell every hook reading local data to re-read. */
export function notifyLocalChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onLocalChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

/** Write a row and queue it for sync, in one transaction. */
export async function writeSynced<T extends SyncedTable>(table: T, row: SyncedRow[T]) {
  const db = await localDb();
  const tx = db.transaction([table, "outbox"], "readwrite");
  await Promise.all([
    tx.objectStore(table).put(row as SavedPhrase & ShowCard),
    tx.objectStore("outbox").put({ key: `${table}:${row.id}`, table, row }),
    tx.done,
  ]);
  notifyLocalChange();
}

/**
 * Wipe every user-data store. Used when a different account signs in on this
 * device, and on sign-out — the server already holds the signed-in user's
 * rows, and the next person to pick up the phone shouldn't see them.
 */
export async function clearUserData() {
  const db = await localDb();
  const stores = ["savedPhrases", "showCards", "tripPacks", "settings", "outbox", "meta"] as const;
  const tx = db.transaction(stores, "readwrite");
  await Promise.all([...stores.map((s) => tx.objectStore(s).clear()), tx.done]);
  notifyLocalChange();
}
