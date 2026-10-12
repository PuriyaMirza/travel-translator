"use client";

import Link from "next/link";
import { useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { CATEGORIES, type Category } from "@/lib/categories";
import { categoryLabel } from "@/lib/labels";
import { authClient } from "@/lib/auth/client";
import { useSavedPhrases } from "@/lib/local/savedPhrases";
import { useTripPacks } from "@/lib/local/tripPacks";
import type { Phrase } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ErrorCard } from "./ErrorCard";
import { PhraseCard } from "./PhraseCard";
import { PhraseCardSkeleton } from "./PhraseCardSkeleton";

/**
 * The vault list (SPEC.md §6, §13): category and trip filters (they combine) plus the three list states —
 * loading skeletons, an empty state that invites action, and an error card.
 */
export function VaultList() {
  const { state, reload } = useSavedPhrases();
  const { data: session, isPending } = authClient.useSession();
  const tripPacks = useTripPacks();
  const [filter, setFilter] = useState<Category | "all">("all");
  const [tripFilter, setTripFilter] = useState<string>("all");

  if (state.status === "loading") {
    return (
      <div className="space-y-3">
        <PhraseCardSkeleton />
        <PhraseCardSkeleton />
        <PhraseCardSkeleton />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <ErrorCard
        message="Couldn't open the phrases saved on this device. Close other tabs of this app and try again."
        onRetry={reload}
      />
    );
  }

  const phrases = state.phrases;
  // Only trips that still have a saved phrase on this device get a pill.
  const trips = tripPacks.filter((t) => phrases.some((p) => p.tripPackId === t.id));
  const activeTrip = trips.some((t) => t.id === tripFilter) ? tripFilter : "all";
  const inTrip = activeTrip === "all" ? phrases : phrases.filter((p) => p.tripPackId === activeTrip);
  const categories = CATEGORIES.filter((c) => inTrip.some((p) => p.category === c));
  const active = filter !== "all" && categories.includes(filter) ? filter : "all";
  const shown = active === "all" ? inTrip : inTrip.filter((p) => p.category === active);

  return (
    <div className="space-y-6">
      {!isPending && !session?.user && (
        <p className="text-small rounded-card bg-sand px-5 py-4 text-ink">
          Saved on this device only.{" "}
          <Link href="/auth/sign-in?next=/vault" className="text-body-bold underline underline-offset-2">
            Sign in
          </Link>{" "}
          to keep them on every device.
        </p>
      )}

      {phrases.length === 0 ? (
        <div className="rounded-card border-2 border-dashed border-hairline p-8 text-center">
          <BookmarkPlus className="mx-auto size-8 text-muted" />
          <p className="text-body mt-3 text-ink">Your vault is ready for its first phrase.</p>
          <p className="text-small mt-1 text-muted">
            Tap the bookmark on any phrase in the{" "}
            <Link href="/" className="text-ink underline underline-offset-2">
              phrasebook
            </Link>{" "}
            or on a{" "}
            <Link href="/translate" className="text-ink underline underline-offset-2">
              translation
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {trips.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by trip">
              {[{ id: "all", title: "All trips" }, ...trips].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTripFilter(t.id)}
                  aria-pressed={activeTrip === t.id}
                  className={cn(
                    "text-small max-w-full truncate rounded-full px-4 py-2 transition motion-reduce:transition-none",
                    activeTrip === t.id ? "bg-charcoal text-inverse" : "bg-sand text-ink hover:bg-sand/70",
                  )}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {(["all", ...categories] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  aria-pressed={active === c}
                  className={cn(
                    "text-small rounded-full px-4 py-2 transition motion-reduce:transition-none",
                    active === c ? "bg-charcoal text-inverse" : "bg-sand text-ink hover:bg-sand/70",
                  )}
                >
                  {c === "all" ? "All" : categoryLabel(c)}
                </button>
              ))}
            </div>
          )}

          <ul className="space-y-3">
            {shown.map((saved) => {
              const phrase: Phrase = {
                ...saved,
                culturalNote: saved.culturalNote || undefined,
              };
              return (
                <li key={saved.id}>
                  <PhraseCard phrase={phrase} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
