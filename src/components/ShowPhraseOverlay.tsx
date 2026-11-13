"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Phrase } from "@/lib/types";
import { useWakeLock } from "@/lib/useWakeLock";
import { ShowSurface, ShowText, showCloseClass } from "./ShowSurface";

/** Marks the history entry the overlay pushes, so Back closes it. */
const HISTORY_FLAG = "showPhraseOverlay";

/**
 * Any phrase, full screen, for someone else to read (SPEC.md §14). The same
 * surface as a show card, but an overlay rather than a route: the phrase can
 * come from the bundle, a translate result held in memory, or IndexedDB, and
 * this is simply handed the one it was opened from. No lookup, no network.
 *
 * Mount it to open it; it calls `onClose` when it should be unmounted.
 *
 * It shows `natural` — what the card it was opened from leads with and
 * speaks. Show cards keep `literal` (SPEC.md §12).
 */
export function ShowPhraseOverlay({ phrase, onClose }: { phrase: Phrase; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The latest onClose without re-running the effect below when it changes.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useWakeLock();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // showModal() traps focus and returns it to the opener on close.
    if (!dialog.open) dialog.showModal();

    // A phone's back button should close the overlay, not leave the page.
    // Push one entry; Back pops it and lands on the same URL.
    // Guarded so a re-run of this effect (React strict mode) pushes only once.
    if (!window.history.state?.[HISTORY_FLAG]) {
      window.history.pushState({ [HISTORY_FLAG]: true }, "");
    }
    let poppedByBack = false;

    const onPopState = () => {
      poppedByBack = true;
      dialog.close();
    };
    // Fires for the close button, Escape and Back alike.
    const onDialogClose = () => {
      if (!poppedByBack && window.history.state?.[HISTORY_FLAG]) window.history.back();
      onCloseRef.current();
    };

    window.addEventListener("popstate", onPopState);
    dialog.addEventListener("close", onDialogClose);
    return () => {
      window.removeEventListener("popstate", onPopState);
      dialog.removeEventListener("close", onDialogClose);
    };
  }, []);

  const language = phrase.targetLanguage ?? "es";

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Showing: ${phrase.sourceText}`}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none flex-col overflow-y-auto bg-charcoal p-0 text-inverse open:flex backdrop:bg-charcoal"
    >
      <ShowSurface
        close={
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className={showCloseClass}
          >
            <X className="size-5" />
          </button>
        }
      >
        <ShowText
          text={phrase.natural}
          lang={language === "es" ? phrase.locale : language}
          voice={language}
          sourceText={phrase.sourceText}
          speakId={`show:${phrase.id}`}
          speakLabel={phrase.natural}
          scale
        />
      </ShowSurface>
    </dialog>
  );
}
