import type { Metadata } from "next";
import { Eyebrow } from "@/components/Eyebrow";
import { ShowCardsList } from "@/components/ShowCardsList";

export const metadata: Metadata = { title: "Cards" };

/** SPEC.md §6, §12: show cards, listed from the device. */
export default function CardsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Eyebrow>Cards</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">Show it, don&rsquo;t say it</h1>
      <p className="text-lead mt-4 mb-8 text-muted">
        For allergies, medication and addresses: write it once, then turn the screen around.
      </p>
      <ShowCardsList />
    </main>
  );
}
