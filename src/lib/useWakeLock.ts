"use client";

import { useEffect } from "react";

/**
 * Keep the screen on while mounted (SPEC.md §12 show mode). Progressive: where
 * the Screen Wake Lock API is missing, or a request is refused (low battery,
 * hidden tab), nothing happens and nothing is shown. The browser drops the
 * lock whenever the page is hidden, so it is re-requested on return.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (active) sentinel = next;
        else void next.release();
      } catch {
        // Refused or unsupported in this state; showing the card still works.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, []);
}
