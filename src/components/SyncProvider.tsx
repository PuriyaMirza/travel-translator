"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { clearUserData, onLocalChange } from "@/lib/local/db";
import { getLocalSettings } from "@/lib/local/settings";
import { claimLocalData, syncNow } from "@/lib/sync/engine";
import {
  changedFields,
  pushSettings,
  reconcileSettings,
  syncedFromLocal,
  type SyncedSettings,
} from "@/lib/sync/settings";

/**
 * Runs sync in the background (SPEC.md §7): on sign-in, when the connection
 * comes back, when the app regains focus, and shortly after any local write.
 * Renders nothing. Mounted once, in the root layout.
 */
export function SyncProvider() {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  const previousUserId = useRef<string | null | undefined>(undefined);
  // The settings last known to be on the server, so a local change while
  // signed in PUTs only the fields that changed. Null until sign-in has
  // reconciled.
  const knownSettings = useRef<SyncedSettings | null>(null);

  // Sign-in claims local data for this account, then syncs. Sign-out clears
  // this device's copy of the account's data; the server keeps it.
  useEffect(() => {
    if (isPending) return;
    const previous = previousUserId.current;
    previousUserId.current = userId;

    if (userId) {
      void claimLocalData(userId)
        .then(async () => {
          knownSettings.current = await reconcileSettings();
        })
        .then(() => syncNow());
    } else {
      knownSettings.current = null;
      if (previous) void clearUserData();
    }
  }, [userId, isPending]);

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), 1500);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncNow();
    };
    const onOnline = () => void syncNow();

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    // Best effort. `knownSettings` only advances when a PUT lands, so a
    // failed field is re-sent with the next local change (or at next sign-in).
    const pushChangedSettings = () => {
      const known = knownSettings.current;
      if (known === null) return;
      void getLocalSettings().then(async (local) => {
        const next = syncedFromLocal(local);
        const patch = changedFields(known, next);
        if (Object.keys(patch).length === 0) return;
        if (await pushSettings(patch)) knownSettings.current = { ...known, ...patch };
      });
    };
    const offLocal = onLocalChange(() => {
      soon();
      pushChangedSettings();
    });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      offLocal();
    };
  }, [userId]);

  return null;
}
