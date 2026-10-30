"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Phrase, SpeakerGender } from "@/lib/types";

/*
 * Recent translations (SPEC.md §13): the 50 most recent successful
 * /api/translate results, in localStorage. Device-local, never synced — a
 * cache, not the vault. Every storage access is wrapped, because localStorage
 * throws in private modes and when the quota is full, and a cache must never
 * break the translate screen.
 *
 * The storage key is a fixed internal identifier, not derived from
 * `brand.name`, for the same reason as the IndexedDB name.
 */
const STORAGE_KEY = "recent-translations";
const CHANGE_EVENT = "recent-translations-changed";
const MAX_ENTRIES = 50;

export interface RecentTranslation {
  key: string;
  sourceText: string;
  locale: string;
  speakerGender: SpeakerGender;
  phrase: Phrase;
  savedAt: string;
}

/**
 * Normalized sourceText (trimmed, lowercased) + locale + speaker gender.
 * SPEC.md §13 keys on text + locale only; gender is in the key here because
 * the translation differs by it (SPEC.md §12), and serving a masculine
 * result to a feminine speaker offline would be wrong.
 */
export function recentKey(sourceText: string, locale: string, speakerGender: SpeakerGender) {
  return `${locale}|${speakerGender}|${sourceText.trim().toLowerCase()}`;
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): RecentTranslation[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (e): e is RecentTranslation =>
        typeof e?.key === "string" &&
        typeof e.sourceText === "string" &&
        typeof e.phrase?.natural === "string" &&
        typeof e.phrase?.sourceText === "string",
    );
  } catch {
    return [];
  }
}

export function listRecentTranslations(): RecentTranslation[] {
  return parse(readRaw());
}

/** The cached result for exactly this text, locale and gender, if any. */
export function findRecentTranslation(
  sourceText: string,
  locale: string,
  speakerGender: SpeakerGender,
): Phrase | undefined {
  const key = recentKey(sourceText, locale, speakerGender);
  return listRecentTranslations().find((e) => e.key === key)?.phrase;
}

/** Store a successful result at the front; a repeat replaces the older entry. */
export function storeRecentTranslation(
  sourceText: string,
  speakerGender: SpeakerGender,
  phrase: Phrase,
) {
  const key = recentKey(sourceText, phrase.locale, speakerGender);
  const entry: RecentTranslation = {
    key,
    sourceText: sourceText.trim(),
    locale: phrase.locale,
    speakerGender,
    phrase,
    savedAt: new Date().toISOString(),
  };
  const next = [entry, ...listRecentTranslations().filter((e) => e.key !== key)].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Full or unavailable: the translation still shows, it just isn't cached.
  }
}

/** Forget every cached result. Called on sign-out with the rest of the device's user data. */
export function clearRecentTranslations() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Unavailable storage holds nothing to clear.
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The cached list, re-read on every change. Empty during server render. */
export function useRecentTranslations(): RecentTranslation[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}
