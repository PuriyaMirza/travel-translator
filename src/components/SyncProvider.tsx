"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { clearUserData, onLocalChange } from "@/lib/local/db";
import { claimLocalData, syncNow } from "@/lib/sync/engine";

/**
 * Runs sync in the background (SPEC.md §7): on sign-in, when the connection
 * comes back, when the app regains focus, and shortly after any local write.
 * Renders nothing. Mounted once, in the root layout.
 */
export function SyncProvider() {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  const previousUserId = useRef<string | null | undefined>(undefined);

  // Sign-in claims local data for this account, then syncs. Sign-out clears
  // this device's copy of the account's data; the server keeps it.
  useEffect(() => {
    if (isPending) return;
    const previous = previousUserId.current;
    previousUserId.current = userId;

    if (userId) {
      void claimLocalData(userId).then(() => syncNow());
    } else if (previous) {
      void clearUserData();
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
    const offLocal = onLocalChange(soon);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      offLocal();
    };
  }, [userId]);

  return null;
}
