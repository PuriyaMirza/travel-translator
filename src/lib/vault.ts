"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { getAuthState, subscribeAuth } from "./authStore";
import { getDb } from "./firebase";
import {
  docIdFor,
  fromRemote,
  readLocal,
  toRemote,
  uploadLocal,
  writeLocal,
  type LocalFirstCollection,
} from "./localFirst";
import type { Phrase, SavedPhrase } from "./types";

/**
 * The vault: saved phrases (SPEC.md §6 `/vault`, §7 data model).
 *
 * One store for the whole app, following auth. Logged out (or on a deployment
 * with no Firebase config) it reads and writes localStorage. Signed in it
 * mirrors `users/{uid}/savedPhrases` through an `onSnapshot` listener, which
 * Firestore's offline cache serves with zero signal (SPEC.md §9). Every save
 * button and the vault page read the same snapshot.
 */
export const SAVED_PHRASES: LocalFirstCollection<SavedPhrase> = {
  name: "savedPhrases",
  storageKey: "vault.savedPhrases.v1",
  dedupeKey: (phrase) => phraseKey(phrase),
  conflictField: "savedAt",
  timestampFields: ["savedAt"],
};

/** SPEC.md §7: dedupe on `sourceText + locale`. */
function phraseKey(phrase: Pick<Phrase, "locale" | "sourceText">) {
  return `${phrase.locale}\u0000${phrase.sourceText.trim()}`;
}

export type VaultState =
  | { status: "loading" }
  | {
      status: "ready";
      /** Newest first. */
      phrases: SavedPhrase[];
      /** Lookup for save buttons: dedupe key → saved entry. */
      byKey: Map<string, SavedPhrase>;
      /** Where these live, so the vault can say so. */
      storage: "device" | "account";
    }
  | { status: "error"; message: string };

const LOADING: VaultState = { status: "loading" };
const LOAD_ERROR =
  "Couldn't load your saved phrases. Check your connection and try again.";

let state: VaultState = LOADING;
const listeners = new Set<() => void>();
let started = false;

type Source =
  | { kind: "local" }
  | { kind: "remote"; uid: string; unsubscribe: (() => void) | null };
let source: Source | null = null;

function emit(next: VaultState) {
  state = next;
  for (const listener of listeners) listener();
}

function emitReady(phrases: SavedPhrase[], storage: "device" | "account") {
  const sorted = [...phrases].sort((a, b) => b.savedAt - a.savedAt);
  const byKey = new Map(sorted.map((phrase) => [phraseKey(phrase), phrase]));
  emit({ status: "ready", phrases: sorted, byKey, storage });
}

function detach() {
  if (source?.kind === "remote") source.unsubscribe?.();
  source = null;
}

function attachLocal() {
  source = { kind: "local" };
  emitReady(readLocal(SAVED_PHRASES), "device");
}

function attachRemote(uid: string) {
  const db = getDb();
  if (!db) {
    attachLocal();
    return;
  }
  const current: Source = { kind: "remote", uid, unsubscribe: null };
  source = current;
  emit(LOADING);

  current.unsubscribe = onSnapshot(
    query(collection(db, "users", uid, SAVED_PHRASES.name), orderBy("savedAt", "desc")),
    (snapshot) => {
      if (source !== current) return;
      emitReady(
        snapshot.docs.map((d) => fromRemote(SAVED_PHRASES, d.data())),
        "account",
      );
    },
    (error) => {
      if (source !== current) return;
      console.error("Vault listener failed.", error);
      emit({ status: "error", message: LOAD_ERROR });
    },
  );

  // Not awaited: the listener is attached first so the vault renders from
  // the cache straight away, and uploaded phrases arrive through it. A failed
  // upload (no signal at sign-in) leaves local phrases in place for the next
  // sign-in to retry.
  uploadLocal(SAVED_PHRASES, uid).catch((error) => {
    console.warn("Uploading device-saved phrases failed; will retry next sign-in.", error);
  });
}

function followAuth() {
  const auth = getAuthState();
  if (auth.status === "loading") return;

  if (auth.status === "signed-in") {
    if (source?.kind === "remote" && source.uid === auth.user.uid) return;
    detach();
    attachRemote(auth.user.uid);
    return;
  }

  if (source?.kind === "local") return;
  detach();
  attachLocal();
}

function onStorage(event: StorageEvent) {
  // Another tab saved or removed a phrase while logged out.
  if (event.key === SAVED_PHRASES.storageKey && source?.kind === "local") {
    emitReady(readLocal(SAVED_PHRASES), "device");
  }
}

function start() {
  if (started) return;
  started = true;
  subscribeAuth(followAuth);
  window.addEventListener("storage", onStorage);
  followAuth();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

export function useVault(): VaultState {
  return useSyncExternalStore(subscribe, () => state, () => LOADING);
}

export function findSaved(vault: VaultState, phrase: Phrase): SavedPhrase | undefined {
  return vault.status === "ready" ? vault.byKey.get(phraseKey(phrase)) : undefined;
}

/** Re-attach after an error (the error state's retry button). */
export function retryVault() {
  detach();
  followAuth();
}

/**
 * Drop the Firestore listener before sign-out tears the cache down
 * (`auth.ts`). The auth change that follows attaches local storage.
 */
export function releaseVault() {
  detach();
  emit(LOADING);
}

export async function savePhrase(phrase: Phrase): Promise<void> {
  const item: SavedPhrase = {
    id: await docIdFor(phraseKey(phrase)),
    locale: phrase.locale,
    sourceText: phrase.sourceText.trim(),
    literal: phrase.literal,
    natural: phrase.natural,
    culturalNote: phrase.culturalNote,
    pronunciation: phrase.pronunciation,
    category: phrase.category,
    targetLanguage: phrase.targetLanguage,
    savedAt: Date.now(),
    syncedFromLocal: false,
  };

  if (source?.kind === "remote") {
    const db = getDb();
    if (!db) return;
    // Offline, this promise only settles once the server acknowledges the
    // write, but the cache — and so the listener and every save button —
    // updates immediately. Callers must not block the UI on it; they only
    // listen for a rejection (e.g. the rules refusing the write).
    await setDoc(doc(db, "users", source.uid, SAVED_PHRASES.name, item.id), toRemote(SAVED_PHRASES, item));
    return;
  }

  const key = phraseKey(item);
  const next = [...readLocal(SAVED_PHRASES).filter((p) => phraseKey(p) !== key), item];
  if (!writeLocal(SAVED_PHRASES, next)) {
    throw new Error("This browser isn't letting the app store phrases.");
  }
  emitReady(next, "device");
}

export async function removePhrase(saved: SavedPhrase): Promise<void> {
  if (source?.kind === "remote") {
    const db = getDb();
    if (!db) return;
    await deleteDoc(doc(db, "users", source.uid, SAVED_PHRASES.name, saved.id));
    return;
  }

  const next = readLocal(SAVED_PHRASES).filter((p) => p.id !== saved.id);
  writeLocal(SAVED_PHRASES, next);
  emitReady(next, "device");
}
