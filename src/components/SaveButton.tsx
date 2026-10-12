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
 */
export function SaveButton({ phrase }: { phrase: Phrase }) {
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
          : "border-hairline bg-card text-muted hover:border-blush hover:text-ink",
      )}
    >
      <Bookmark className={cn("size-5", saved && "fill-current")} />
    </button>
  );
}
