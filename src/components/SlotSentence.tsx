"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { SLOT_MARKER, blankSlot } from "@/lib/slot";
import type { SlotOption } from "@/lib/types";

/** The select value that means "none of these": not an option id. */
const OTHER = "__other";

/**
 * The English line of a fill-in-the-blank phrase (SPEC.md §14): the sentence
 * with its blank as a chip the user can change — "Where is [the bathroom ▾]?"
 *
 * The chip is a native `<select>`, the same choice onboarding made: a phone
 * opens its own picker, and a screen reader gets a labelled control without
 * any custom listbox code.
 *
 * The last entry, "Something else…", leaves for `/translate` with the
 * sentence prefilled. That is the bridge from fixed content to the model,
 * and the one path here that needs signal.
 */
export function SlotSentence({
  template,
  options,
  value,
  onChange,
}: {
  /** The English template, containing the slot marker once. */
  template: string;
  options: SlotOption[];
  /** The chosen option's id. */
  value: string;
  onChange: (optionId: string) => void;
}) {
  const router = useRouter();
  const [before, after = ""] = template.split(SLOT_MARKER);

  return (
    <p className="text-small flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-muted">
      {before.trim() && <span>{before.trim()}</span>}
      <span className="relative inline-flex max-w-full">
        <select
          value={value}
          aria-label={`Choose what goes in the blank: ${blankSlot(template)}`}
          onChange={(event) => {
            // Not stored: the select snaps back to the current option while
            // the app navigates away.
            if (event.target.value === OTHER) {
              router.push(`/translate?text=${encodeURIComponent(blankSlot(template))}`);
              return;
            }
            onChange(event.target.value);
          }}
          className="min-h-9 max-w-full appearance-none truncate rounded-full border border-ink bg-sand/50 py-1 pr-8 pl-3 font-semibold text-ink focus:border-brand focus:outline-none"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.sourceText}
            </option>
          ))}
          <option value={OTHER}>Something else…</option>
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink" />
      </span>
      {after.trim() && <span>{after.trim()}</span>}
    </p>
  );
}
