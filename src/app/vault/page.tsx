import type { Metadata } from "next";
import { Eyebrow } from "@/components/Eyebrow";
import { VaultList } from "@/components/VaultList";

export const metadata: Metadata = { title: "Vault" };

/** SPEC.md §6: saved phrases, filterable by category. Reads from the device. */
export default function VaultPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Eyebrow>Vault</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">Saved phrases</h1>
      <p className="text-lead mt-4 mb-8 text-muted">
        Everything you&rsquo;ve kept, ready with no signal.
      </p>
      <VaultList />
    </main>
  );
}
