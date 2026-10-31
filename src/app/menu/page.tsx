import type { Metadata } from "next";
import { MenuScanner } from "@/components/MenuScanner";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: `Menu · ${brand.name}` };

/**
 * SPEC.md §14: photograph a menu, read it as an English table with the
 * original alongside. The page is static; capture, every state and the
 * results table live in the client component.
 */
export default function MenuPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-display mb-6 font-display text-ink">Read a menu</h1>
      <MenuScanner />
    </main>
  );
}
