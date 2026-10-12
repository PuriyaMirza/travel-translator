"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Pencil, Plus, SquarePen, Trash2, X } from "lucide-react";
import { SHOW_CARD_KIND_LABELS } from "@/lib/labels";
import { deleteShowCard, renameShowCard, useShowCards } from "@/lib/local/showCards";
import { SHOW_CARD_KIND_META } from "@/lib/showCardMeta";
import type { ShowCard } from "@/lib/types";
import { ErrorCard } from "./ErrorCard";
import { PhraseCardSkeleton } from "./PhraseCardSkeleton";
import { ShowCardKindTiles } from "./ShowCardKindTiles";

const actionClass =
  "text-small inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-ink transition hover:bg-sand/70 motion-reduce:transition-none";

/**
 * The /cards list (SPEC.md §6, §12): loading skeletons, an empty state that
 * offers the five kinds as tiles, an error card, and the cards themselves.
 * Reads only from IndexedDB, so it works with no signal.
 */
export function ShowCardsList() {
  const { state, reload } = useShowCards();

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
        message="Couldn't open the cards saved on this device. Close other tabs of this app and try again."
        onRetry={reload}
      />
    );
  }

  if (state.cards.length === 0) {
    return (
      <div className="rounded-card border-2 border-dashed border-hairline p-6 sm:p-8">
        <p className="text-body-bold text-ink">Make your first card.</p>
        <p className="text-small mt-1 mb-5 text-muted">
          Pick what it&rsquo;s for. You write it in English, and it opens full screen in Spanish.
        </p>
        <ShowCardKindTiles />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/cards/new"
        className="text-body-bold inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-inverse transition hover:bg-brand-hover active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <Plus className="size-4" />
        New card
      </Link>
      <ul className="space-y-3">
        {state.cards.map((card) => (
          <li key={card.id}>
            <CardRow card={card} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardRow({ card }: { card: ShowCard }) {
  const [mode, setMode] = useState<"idle" | "renaming" | "deleting">("idle");
  const [title, setTitle] = useState(card.title);
  const { icon: Icon } = SHOW_CARD_KIND_META[card.kind];

  const submitRename = async () => {
    const next = title.trim();
    if (next && next !== card.title) await renameShowCard(card.id, next);
    setMode("idle");
  };

  return (
    <article className="rounded-card border border-hairline bg-card p-5 shadow-soft">
      <Link href={`/cards/${card.id}`} className="group block">
        <div className="flex items-start gap-3">
          <span aria-hidden className="rounded-image flex size-11 shrink-0 items-center justify-center bg-sand">
            <Icon className="size-5 text-ink/70" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-bold truncate text-ink">{card.title}</p>
            <p className="text-small text-muted">{SHOW_CARD_KIND_LABELS.en[card.kind]}</p>
            <p lang={card.locale} className="text-body mt-2 line-clamp-2 whitespace-pre-line text-ink">
              {card.literal}
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-4 border-t border-hairline pt-3">
        {mode === "renaming" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitRename();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              autoFocus
              aria-label="Card name"
              className="text-body min-w-0 flex-1 rounded-full border border-hairline bg-canvas px-4 py-2 text-ink focus:border-blush focus:outline-none"
            />
            <button type="submit" aria-label="Save name" className={actionClass}>
              <Check className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Cancel rename"
              onClick={() => {
                setTitle(card.title);
                setMode("idle");
              }}
              className={actionClass}
            >
              <X className="size-4" />
            </button>
          </form>
        ) : mode === "deleting" ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-small mr-auto text-ink">Delete this card?</p>
            <button type="button" onClick={() => void deleteShowCard(card.id)} className={actionClass}>
              <Trash2 className="size-4" />
              Delete
            </button>
            <button type="button" onClick={() => setMode("idle")} className={actionClass}>
              Keep
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setMode("renaming")} className={actionClass}>
              <Pencil className="size-4" />
              Rename
            </button>
            <Link href={`/cards/edit?id=${card.id}`} className={actionClass}>
              <SquarePen className="size-4" />
              Edit
            </Link>
            <button type="button" onClick={() => setMode("deleting")} className={actionClass}>
              <Trash2 className="size-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
