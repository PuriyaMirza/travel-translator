"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import type { Phrase } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ShowPhraseOverlay } from "./ShowPhraseOverlay";

/**
 * Whether a phrase can be shown to a local: only when its text is in the
 * language of the place. An es→en translation result is English, and there
 * is nobody to show that to.
 */
export function canShow(phrase: Phrase): boolean {
  return (phrase.targetLanguage ?? "es") === "es";
}

/**
 * Opens a phrase full screen (SPEC.md §14).
 *
 * `variant="text"` wraps the phrase itself: on a card or in a list the Spanish
 * is the control, marked with a small expand glyph, so no third button
 * crowds the row. `variant="icon"` is a round button for action rows.
 *
 * Renders its children untouched when the phrase can't be shown.
 */
export function ShowTrigger({
  phrase,
  variant = "text",
  className,
  children,
}: {
  phrase: Phrase;
  variant?: "text" | "icon";
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!canShow(phrase)) return variant === "text" ? <div className={className}>{children}</div> : null;

  const label = `Show "${phrase.natural}" full screen`;

  return (
    <>
      {variant === "text" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className={cn(
            "group -mx-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-xl px-2 py-1 text-left transition",
            "hover:bg-sand/60 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
            className,
          )}
        >
          <span className="min-w-0 flex-1">{children}</span>
          <Maximize2 aria-hidden className="mt-1.5 size-3.5 shrink-0 text-muted" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border border-ink text-ink transition hover:bg-sand/60",
            "active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
            className,
          )}
        >
          <Maximize2 className="size-[18px]" />
        </button>
      )}
      {open && <ShowPhraseOverlay phrase={phrase} onClose={() => setOpen(false)} />}
    </>
  );
}
