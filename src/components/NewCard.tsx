"use client";

import { useSearchParams } from "next/navigation";
import { SHOW_CARD_KINDS, type ShowCardKind } from "@/lib/types";
import { Eyebrow } from "./Eyebrow";
import { ShowCardForm } from "./ShowCardForm";
import { ShowCardKindTiles } from "./ShowCardKindTiles";

/** /cards/new: the form for `?kind=`, or the five kinds to choose from. */
export function NewCard() {
  const kind = useSearchParams().get("kind");
  if (SHOW_CARD_KINDS.includes(kind as ShowCardKind)) {
    return <ShowCardForm kind={kind as ShowCardKind} />;
  }
  return (
    <div>
      <Eyebrow>New card</Eyebrow>
      <h1 className="text-display mt-2 mb-8 font-display text-ink">What is it for?</h1>
      <ShowCardKindTiles />
    </div>
  );
}
