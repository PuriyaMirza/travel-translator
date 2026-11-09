"use client";

import { usePathname } from "next/navigation";
import { isChromelessPath } from "@/lib/nav";

/**
 * Hides the app chrome (header, offline banner) in show mode, which is a
 * full-screen dark reading surface (SPEC.md §12), and on the full-screen
 * onboarding flow. The children stay server
 * components; this only decides whether to render them.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  return isChromelessPath(usePathname()) ? null : <>{children}</>;
}
