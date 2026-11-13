"use client";

import { useId, useRef } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "still a draft" marker (SPEC.md §14): a small alert icon beside a
 * high-stakes phrase whose text no fluent speaker has checked yet. Tapping it
 * opens a short explanation. Callers decide when to render it
 * (`showsDraftNotice` in `review.ts`).
 */
export function DraftNotice({ className }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // A page can hold several of these, so the title id must be unique.
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="This text is still a draft. What does that mean?"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-brand transition hover:bg-sand/60 motion-reduce:transition-none",
          className,
        )}
      >
        <CircleAlert aria-hidden className="size-[18px]" />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // A tap on the backdrop closes it; taps inside land on the inner div.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(20rem,calc(100vw-2rem))] rounded-card border border-ink bg-card p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="flex flex-col gap-3 p-6">
          <h2 id={titleId} className="text-h2 flex items-center gap-2">
            <CircleAlert aria-hidden className="size-5 shrink-0 text-brand" />
            This text is still a draft
          </h2>
          <p className="text-body">
            A fluent speaker hasn&rsquo;t checked this phrase yet. It should be understood, but the wording may
            change once it has been reviewed.
          </p>
          <form method="dialog">
            <button
              type="submit"
              className="mt-1 w-full rounded-full bg-brand py-3 text-[15px] font-bold text-inverse transition hover:bg-brand-hover motion-reduce:transition-none"
            >
              OK
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
