"use client";

import { useCallback, useEffect, useState } from "react";
import type { Phrase, SavedPhrase } from "@/lib/types";
import { localDb, onLocalChange, writeSynced } from "./db";

/** Dedupe key (SPEC.md §7): locale + normalized sourceText. */
export function savedPhraseKey(p: { locale: string; sourceText: string }) {
  return `${p.locale}|${p.sourceText.trim().toLowerCase()}`;
}

/** Live (non-deleted) saved phrases, newest first. */
export async function listSavedPhrases(): Promise<SavedPhrase[]> {
  const db = await localDb();
  const all = await db.getAll("savedPhrases");
  return all
    .filter((p) => !p.deletedAt)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Save a phrase. A phrase already saved is returned as-is, not duplicated. */
export async function savePhrase(phrase: Phrase): Promise<SavedPhrase> {
  const key = savedPhraseKey(phrase);
  const existing = (await listSavedPhrases()).find((p) => savedPhraseKey(p) === key);
  if (existing) return existing;

  const now = new Date().toISOString();
  const saved: SavedPhrase = {
    id: crypto.randomUUID(),
    locale: phrase.locale,
    sourceText: phrase.sourceText,
    literal: phrase.literal,
    natural: phrase.natural,
    culturalNote: phrase.culturalNote ?? "",
    pronunciation: phrase.pronunciation,
    category: phrase.category,
    savedAt: now,
    updatedAt: now,
  };
  await writeSynced("savedPhrases", saved);
  return saved;
}

/** Delete as a tombstone, so the delete reaches other devices. */
export async function deleteSavedPhrase(id: string) {
  const db = await localDb();
  const row = await db.get("savedPhrases", id);
  if (!row || row.deletedAt) return;
  const now = new Date().toISOString();
  await writeSynced("savedPhrases", { ...row, deletedAt: now, updatedAt: now });
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; phrases: SavedPhrase[] }
  | { status: "error" };

/** Saved phrases from IndexedDB, re-read whenever local data changes. */
export function useSavedPhrases() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(() => {
    listSavedPhrases().then(
      (phrases) => setState({ status: "ready", phrases }),
      () => setState({ status: "error" }),
    );
  }, []);

  useEffect(() => {
    load();
    return onLocalChange(load);
  }, [load]);

  return { state, reload: load };
}
