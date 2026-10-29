"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import type { Phrase } from "@/lib/types";
import { onLocalChange } from "@/lib/local/db";
import {
  deleteSavedPhrase,
  listSavedPhrases,
  savePhrase,
  savedPhraseKey,
} from "@/lib/local/savedPhrases";
import { cn } from "@/lib/utils";

/**
 * Save / unsave a phrase to the vault. Writes go to the device first (SPEC.md
 * §7), so this works with no signal and no account.
 *
 * `variant="pill"` is the full-width labelled button under a translation
 * result (Stamp blues design); the default is the icon-only circle.
 */
export function SaveButton({
  phrase,
  variant = "icon",
  className,
}: {
  phrase: Phrase;
  variant?: "icon" | "pill";
  className?: string;
}) {
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    const key = savedPhraseKey(phrase);
    listSavedPhrases().then(
      (all) => setSavedId(all.find((p) => savedPhraseKey(p) === key)?.id ?? null),
      () => setSavedId(null),
    );
  }, [phrase]);

  useEffect(() => {
    refresh();
    return onLocalChange(refresh);
  }, [refresh]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (savedId) await deleteSavedPhrase(savedId);
      else await savePhrase(phrase);
    } finally {
      setBusy(false);
    }
  };

  const saved = savedId !== null;

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={saved}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-brand py-4 text-[15px] font-bold transition",
          "active:scale-[0.98] disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100",
          saved ? "bg-canvas text-brand" : "bg-brand text-inverse hover:bg-brand-hover",
          className,
        )}
      >
        <Bookmark aria-hidden className={cn("size-[18px]", saved && "fill-current")} />
        {saved ? "Saved to vault" : "Save to vault"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove "${phrase.sourceText}" from your vault` : `Save "${phrase.sourceText}" to your vault`}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border transition",
        "active:scale-95 disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100",
        saved
          ? "border-ink bg-ink text-inverse"
          : "border-ink text-ink hover:bg-sand/60",
        className,
      )}
    >
      <Bookmark className={cn("size-[18px]", saved && "fill-current")} />
    </button>
  );
}
