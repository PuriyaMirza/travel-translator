"use client";

import { useCallback, useEffect, useState } from "react";
import type { Phrase, TripPack } from "@/lib/types";
import { localDb, notifyLocalChange, onLocalChange } from "./db";
import { listSavedPhrases, savePhrase, savedPhraseKey } from "./savedPhrases";

/*
 * Trip packs (SPEC.md §13). Unlike saved phrases and show cards they are
 * created online only and never enter the outbox: the server row is written
 * first, then copied here, and `/api/trip-packs` refreshes the copy after each
 * sync so other devices can name the trips on their saved phrases.
 */

/** Every trip pack on this device, newest first. */
export async function listTripPacks(): Promise<TripPack[]> {
  const db = await localDb();
  const all = await db.getAll("tripPacks");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Pull the signed-in user's trip packs from the server into IndexedDB.
 * Returns true only if something changed, so the caller can announce it
 * without re-triggering a sync every time (a sync calls this).
 */
export async function refreshTripPacks(): Promise<boolean> {
  const response = await fetch("/api/trip-packs");
  if (!response.ok) return false;
  const { tripPacks } = (await response.json()) as { tripPacks: TripPack[] };

  const db = await localDb();
  const tx = db.transaction("tripPacks", "readwrite");
  let changed = false;
  for (const remote of tripPacks) {
    const local = await tx.store.get(remote.id);
    if (!local || JSON.stringify(local) !== JSON.stringify(remote)) {
      await tx.store.put(remote);
      changed = true;
    }
  }
  await tx.done;
  return changed;
}

export interface SaveTripPackResult {
  added: number;
  /** Checked phrases already in the vault, which stay as they were. */
  alreadySaved: number;
}

/**
 * Save a previewed trip pack: POST the trip pack (online), copy it to
 * IndexedDB, then save each phrase with `tripPackId` set. The existing sync
 * pushes the phrases. Phrases already in the vault are skipped, and the
 * trip pack only counts the new ones; if every phrase is already saved no
 * trip pack is created at all.
 *
 * Throws on a failed POST, before anything is written locally.
 */
export async function saveTripPack(
  pack: { title: string; description: string; locale: string },
  phrases: Phrase[],
): Promise<SaveTripPackResult> {
  const saved = new Set((await listSavedPhrases()).map(savedPhraseKey));
  const fresh: Phrase[] = [];
  for (const phrase of phrases) {
    const key = savedPhraseKey(phrase);
    if (saved.has(key)) continue;
    saved.add(key);
    fresh.push(phrase);
  }
  const result = { added: fresh.length, alreadySaved: phrases.length - fresh.length };
  if (fresh.length === 0) return result;

  const id = crypto.randomUUID();
  const response = await fetch("/api/trip-packs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...pack, phraseCount: fresh.length }),
  });
  if (!response.ok) throw new Error(`Trip pack POST failed: ${response.status}`);
  const { tripPack } = (await response.json()) as { tripPack: TripPack };

  const db = await localDb();
  await db.put("tripPacks", tripPack);
  for (const phrase of fresh) await savePhrase(phrase, { tripPackId: tripPack.id });
  notifyLocalChange();
  return result;
}

/** Trip packs from IndexedDB, re-read whenever local data changes. */
export function useTripPacks(): TripPack[] {
  const [tripPacks, setTripPacks] = useState<TripPack[]>([]);

  const load = useCallback(() => {
    listTripPacks().then(setTripPacks, () => {});
  }, []);

  useEffect(() => {
    load();
    return onLocalChange(load);
  }, [load]);

  return tripPacks;
}
