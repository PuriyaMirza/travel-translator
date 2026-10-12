import type { Metadata } from "next";
import { Eyebrow } from "@/components/Eyebrow";
import { TripPackBuilder } from "@/components/TripPackBuilder";

export const metadata: Metadata = { title: "Trip" };

/**
 * SPEC.md §6, §13: describe a trip, preview the phrases generated for it,
 * save the ones you want to the vault. The page is static; the signed-in
 * check and everything else happens in the client component.
 */
export default function TripPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Eyebrow>Trip</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">Phrases for your trip</h1>
      <p className="text-lead mt-4 mb-8 text-muted">
        Describe where you&rsquo;re going and how. You&rsquo;ll get 25 phrases made for that trip,
        ready to keep for when you have no signal.
      </p>
      <TripPackBuilder />
    </main>
  );
}
