"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { clearUserData, onLocalChange } from "@/lib/local/db";
import { getLocalSettings } from "@/lib/local/settings";
import { claimLocalData, syncNow } from "@/lib/sync/engine";
import { pushSpeakerGender, reconcileSettings } from "@/lib/sync/settings";
import type { SpeakerGender } from "@/lib/types";

/**
 * Runs sync in the background (SPEC.md §7): on sign-in, when the connection
 * comes back, when the app regains focus, and shortly after any local write.
 * Renders nothing. Mounted once, in the root layout.
 */
export function SyncProvider() {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  const previousUserId = useRef<string | null | undefined>(undefined);
  // The speaker gender last known to be on the server, so a local change
  // while signed in is PUT once. Null until sign-in has reconciled.
  const knownGender = useRef<SpeakerGender | null>(null);

  // Sign-in claims local data for this account, then syncs. Sign-out clears
  // this device's copy of the account's data; the server keeps it.
  useEffect(() => {
    if (isPending) return;
    const previous = previousUserId.current;
    previousUserId.current = userId;

    if (userId) {
      void claimLocalData(userId)
        .then(async () => {
          knownGender.current = await reconcileSettings();
        })
        .then(() => syncNow());
    } else {
      knownGender.current = null;
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
    // Best effort: if the PUT fails (offline), the next sign-in reconciles.
    const pushGender = () => {
      if (knownGender.current === null) return;
      void getLocalSettings().then(async ({ speakerGender }) => {
        if (speakerGender === knownGender.current) return;
        knownGender.current = speakerGender;
        await pushSpeakerGender(speakerGender);
      });
    };
    const offLocal = onLocalChange(() => {
      soon();
      pushGender();
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
