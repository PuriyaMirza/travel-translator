"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useSyncExternalStore } from "react";
import { getFirebaseAuth } from "./firebase";
import { ensureUserDoc } from "./userDoc";

/**
 * Who is signed in, as an external store: Firebase owns this state and
 * reports it through a callback, which is what useSyncExternalStore is for
 * (same pattern as `useSpeech`). Plain functions are exported alongside the
 * hook so non-React code — the vault store — can follow auth too.
 *
 * `unavailable` means this deployment has no Firebase config; the app keeps
 * working with device-only storage.
 */
export type AuthState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: User };

const LOADING: AuthState = { status: "loading" };

let state: AuthState = LOADING;
let started = false;
const listeners = new Set<() => void>();

function emit(next: AuthState) {
  state = next;
  for (const listener of listeners) listener();
}

function start() {
  if (started) return;
  started = true;
  const auth = getFirebaseAuth();
  if (!auth) {
    // Deferred so a subscriber registered in the same tick still hears it.
    queueMicrotask(() => emit({ status: "unavailable" }));
    return;
  }
  onAuthStateChanged(auth, (user) => {
    emit(user ? { status: "signed-in", user } : { status: "signed-out" });
    if (user) {
      ensureUserDoc(user).catch((error) =>
        console.warn("Could not create the user record; will retry next load.", error),
      );
    }
  });
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthState(): AuthState {
  return state;
}

export function useAuth(): AuthState {
  // Server snapshot is `loading`: auth is browser-only, so the prerendered
  // HTML shows the neutral state and hydration fills it in.
  return useSyncExternalStore(subscribeAuth, getAuthState, () => LOADING);
}
