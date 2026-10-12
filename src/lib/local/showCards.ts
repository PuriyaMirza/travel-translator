"use client";

import { useCallback, useEffect, useState } from "react";
import { brand } from "@/lib/brand";
import type { ShowCard, ShowCardKind } from "@/lib/types";
import { localDb, onLocalChange, writeSynced } from "./db";

/** The translated part of a card: what a model call (or the address rule) produces. */
export type CardTranslation = Pick<ShowCard, "literal" | "natural" | "culturalNote" | "pronunciation">;

/** Live (non-deleted) show cards, most recently changed first. */
export async function listShowCards(): Promise<ShowCard[]> {
  const db = await localDb();
  const all = await db.getAll("showCards");
  return all
    .filter((c) => !c.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** One live card, or undefined if it isn't on this device (or was deleted). */
export async function getShowCard(id: string): Promise<ShowCard | undefined> {
  const db = await localDb();
  const card = await db.get("showCards", id);
  return card && !card.deletedAt ? card : undefined;
}

export async function createShowCard(input: {
  kind: ShowCardKind;
  title: string;
  sourceText: string;
  translation: CardTranslation;
}): Promise<ShowCard> {
  const now = new Date().toISOString();
  const card: ShowCard = {
    id: crypto.randomUUID(),
    locale: brand.defaultLocale,
    kind: input.kind,
    title: input.title,
    sourceText: input.sourceText,
    ...input.translation,
    createdAt: now,
    updatedAt: now,
  };
  await writeSynced("showCards", card);
  return card;
}

/** Replace a card's English and its stored translation (a re-translate). */
export async function updateShowCard(
  id: string,
  input: { title: string; sourceText: string; translation: CardTranslation },
) {
  const db = await localDb();
  const row = await db.get("showCards", id);
  if (!row || row.deletedAt) return;
  await writeSynced("showCards", {
    ...row,
    title: input.title,
    sourceText: input.sourceText,
    ...input.translation,
    updatedAt: new Date().toISOString(),
  });
}

/** Rename only. No signal needed: the translation is untouched. */
export async function renameShowCard(id: string, title: string) {
  const db = await localDb();
  const row = await db.get("showCards", id);
  if (!row || row.deletedAt) return;
  await writeSynced("showCards", { ...row, title, updatedAt: new Date().toISOString() });
}

/** Delete as a tombstone, so the delete reaches other devices. */
export async function deleteShowCard(id: string) {
  const db = await localDb();
  const row = await db.get("showCards", id);
  if (!row || row.deletedAt) return;
  const now = new Date().toISOString();
  await writeSynced("showCards", { ...row, deletedAt: now, updatedAt: now });
}

type ListState =
  | { status: "loading" }
  | { status: "ready"; cards: ShowCard[] }
  | { status: "error" };

/** Show cards from IndexedDB, re-read whenever local data changes. */
export function useShowCards() {
  const [state, setState] = useState<ListState>({ status: "loading" });

  const load = useCallback(() => {
    listShowCards().then(
      (cards) => setState({ status: "ready", cards }),
      () => setState({ status: "error" }),
    );
  }, []);

  useEffect(() => {
    load();
    return onLocalChange(load);
  }, [load]);

  return { state, reload: load };
}

type CardState =
  | { status: "loading" }
  | { status: "ready"; card: ShowCard }
  | { status: "missing" }
  | { status: "error" };

/** One card from IndexedDB, re-read whenever local data changes. */
export function useShowCard(id: string | undefined) {
  const [state, setState] = useState<CardState>({ status: "loading" });

  const load = useCallback(() => {
    if (!id) return;
    getShowCard(id).then(
      (card) => setState(card ? { status: "ready", card } : { status: "missing" }),
      () => setState({ status: "error" }),
    );
  }, [id]);

  useEffect(() => {
    load();
    return onLocalChange(load);
  }, [load]);

  return { state, reload: load };
}
