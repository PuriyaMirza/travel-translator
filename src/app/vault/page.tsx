import type { Metadata } from "next";
import { Eyebrow } from "@/components/Eyebrow";
import { VaultList } from "@/components/VaultList";

export const metadata: Metadata = { title: "Vault" };

/**
 * SPEC.md §6 `/vault`: saved phrases, filterable by category. Typographic
 * editorial header like /translate — there is no single image identity here.
 * The list itself is client-rendered from the vault store, so it works with
 * zero signal once M4's service worker caches the shell (SPEC.md §9).
 */
export default function VaultPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Eyebrow>Vault</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">Your phrases</h1>
      <p className="text-lead mt-4 mb-8 text-muted">
        Everything you&rsquo;ve saved, ready to show or say — with or without signal.
      </p>
      <VaultList />
    </main>
  );
}
