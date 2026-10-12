"use client";

import { usePathname } from "next/navigation";
import { isShowModePath } from "@/lib/nav";

/**
 * Hides the app chrome (header, offline banner) in show mode, which is a
 * full-screen dark reading surface (SPEC.md §12). The children stay server
 * components; this only decides whether to render them.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  return isShowModePath(usePathname()) ? null : <>{children}</>;
}
