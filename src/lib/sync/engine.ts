"use client";

import type { SavedPhrase, ShowCard } from "@/lib/types";
import { clearUserData, localDb, notifyLocalChange, type SyncedTable } from "@/lib/local/db";

/*
 * Client half of the generic sync helper (SPEC.md §7 "Local-first sync").
 * Push the outbox, then pull what changed elsewhere, merging by last write
 * wins on updatedAt. Safe to call any time: it no-ops offline, reports
 * "signed-out" on a 401, and never runs twice at once.
 */

export type SyncResult = "synced" | "offline" | "signed-out" | "error";

const TABLES: SyncedTable[] = ["savedPhrases", "showCards"];
type Row = SavedPhrase | ShowCard;

let running: Promise<SyncResult> | null = null;

export function syncNow(): Promise<SyncResult> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run(): Promise<SyncResult> {
  if (!navigator.onLine) return "offline";
  try {
    const pushed = await push();
    if (pushed !== "synced") return pushed;
    return await pull();
  } catch {
    return navigator.onLine ? "error" : "offline";
  }
}

async function push(): Promise<SyncResult> {
  const db = await localDb();
  const entries = await db.getAll("outbox");
  if (entries.length === 0) return "synced";

  const body: Record<SyncedTable, Row[]> = { savedPhrases: [], showCards: [] };
  for (const entry of entries) body[entry.table].push(entry.row);

  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 401) return "signed-out";
  if (!response.ok) return "error";

  // Clear only entries that weren't rewritten while the request was in flight.
  const tx = db.transaction("outbox", "readwrite");
  for (const sent of entries) {
    const current = await tx.store.get(sent.key);
    if (current && current.row.updatedAt === sent.row.updatedAt) await tx.store.delete(sent.key);
  }
  await tx.done;
  return "synced";
}

async function pull(): Promise<SyncResult> {
  const db = await localDb();
  const since = await db.get("meta", "cursor");
  const response = await fetch(`/api/sync${since ? `?since=${encodeURIComponent(since)}` : ""}`);
  if (response.status === 401) return "signed-out";
  if (!response.ok) return "error";

  const data = (await response.json()) as { cursor: string } & Record<SyncedTable, Row[]>;
  let changed = false;

  for (const table of TABLES) {
    const tx = db.transaction([table, "outbox"], "readwrite");
    const store = tx.objectStore(table);
    for (const remote of data[table] ?? []) {
      const local = await store.get(remote.id);
      const pending = await tx.objectStore("outbox").get(`${table}:${remote.id}`);
      // A local edit still waiting to be pushed wins until the server has it.
      if (pending && pending.row.updatedAt >= remote.updatedAt) continue;
      // Strictly newer only: the pull window overlaps, so the same row comes
      // back more than once. The one same-timestamp case that matters is the
      // server tombstoning a duplicate this device sent.
      const newer =
        !local ||
        remote.updatedAt > local.updatedAt ||
        (remote.updatedAt === local.updatedAt && !!remote.deletedAt && !local.deletedAt);
      if (newer) {
        await store.put(remote as SavedPhrase & ShowCard);
        changed = true;
      }
    }
    await tx.done;
  }

  await db.put("meta", data.cursor, "cursor");
  if (changed) notifyLocalChange();
  return "synced";
}

/**
 * Make sure local data belongs to `userId` before syncing. Logged-out data
 * (no owner yet) is adopted by whoever signs in first; data owned by a
 * different account is cleared so it never uploads into the wrong account.
 */
export async function claimLocalData(userId: string): Promise<"kept" | "cleared"> {
  const db = await localDb();
  const owner = await db.get("meta", "owner");
  if (owner && owner !== userId) {
    await clearUserData();
    await db.put("meta", userId, "owner");
    return "cleared";
  }
  if (!owner) await db.put("meta", userId, "owner");
  return "kept";
}
