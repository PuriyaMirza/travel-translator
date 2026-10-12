"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useShowCard } from "@/lib/local/showCards";
import { ErrorCard } from "./ErrorCard";
import { PhraseCardSkeleton } from "./PhraseCardSkeleton";
import { ShowCardForm } from "./ShowCardForm";

/** /cards/edit?id=…: edits a card from IndexedDB. */
export function EditCard() {
  const id = useSearchParams().get("id") ?? undefined;
  const { state, reload } = useShowCard(id);

  if (!id || state.status === "missing") {
    return (
      <p className="text-body text-ink">
        This card isn&rsquo;t on this device.{" "}
        <Link href="/cards" className="underline underline-offset-2">
          Back to your cards
        </Link>
      </p>
    );
  }
  if (state.status === "loading") return <PhraseCardSkeleton />;
  if (state.status === "error") {
    return (
      <ErrorCard
        message="Couldn't open the cards saved on this device. Close other tabs of this app and try again."
        onRetry={reload}
      />
    );
  }
  return <ShowCardForm kind={state.card.kind} card={state.card} />;
}
