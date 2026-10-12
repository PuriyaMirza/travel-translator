"use client";

import { WifiOff } from "lucide-react";
import { OFFLINE_BANNER } from "@/lib/messages";
import { useIsOffline } from "@/lib/useIsOffline";

/** Sits under the header while offline. A statement, not an error. */
export function OfflineBanner() {
  const offline = useIsOffline();
  if (!offline) return null;

  return (
    <div
      role="status"
      className="border-b border-hairline bg-sand text-ink"
    >
      <p className="text-small mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
        <WifiOff className="size-4 shrink-0 text-muted" aria-hidden />
        {OFFLINE_BANNER}
      </p>
    </div>
  );
}
