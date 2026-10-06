"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import type { Phrase } from "@/lib/types";
import { findSaved, removePhrase, savePhrase, useVault } from "@/lib/vault";
import { cn } from "@/lib/utils";

/**
 * Save / unsave a phrase to the vault. Works logged out (device storage) and
 * signed in (Firestore, offline-capable) — the vault store decides which.
 *
 * Absent until the vault has loaded, mirroring SpeakButton: a button that
 * can't yet know whether the phrase is saved would show the wrong state.
 */
export function SaveButton({ phrase }: { phrase: Phrase }) {
  const vault = useVault();
  if (vault.status !== "ready") return null;

  const saved = findSaved(vault, phrase);
  const toggle = () => {
    // Not awaited: signed-in writes land in the offline cache immediately and
    // only settle when the server acknowledges, which may be much later.
    const action = saved ? removePhrase(saved) : savePhrase(phrase);
    action.catch((error) => console.error("Saving the phrase failed.", error));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={Boolean(saved)}
      aria-label={saved ? `Remove ${phrase.natural} from vault` : `Save ${phrase.natural} to vault`}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border transition",
        "active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
        saved
          ? "border-blush bg-card text-brand"
          : "border-hairline bg-card text-muted hover:border-blush hover:text-brand",
      )}
    >
      {saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
    </button>
  );
}
