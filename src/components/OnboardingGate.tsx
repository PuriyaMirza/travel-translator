"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { localDb } from "@/lib/local/db";
import { hasCompletedOnboarding, markOnboardingComplete } from "@/lib/onboarding";

/**
 * Sends a first-time visitor on Home to /welcome. Renders nothing.
 *
 * Not first-time, and marked done without being asked: anyone signed in, and
 * any device that already has saved phrases or settings (people who used the
 * app before onboarding existed).
 */
export function OnboardingGate() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (isPending || hasCompletedOnboarding()) return;
    if (signedIn) {
      markOnboardingComplete();
      return;
    }

    let cancelled = false;
    void (async () => {
      let returning = false;
      try {
        const db = await localDb();
        const [phrases, settings] = await Promise.all([db.count("savedPhrases"), db.get("settings", "settings")]);
        returning = phrases > 0 || settings !== undefined;
      } catch {
        // IndexedDB unavailable: treat as new; onboarding still works without it.
      }
      if (cancelled) return;
      if (returning) markOnboardingComplete();
      else router.replace("/welcome");
    })();

    return () => {
      cancelled = true;
    };
  }, [isPending, signedIn, router]);

  return null;
}
