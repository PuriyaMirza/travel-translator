"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, type Category } from "@/lib/categories";
import { categoryLabel } from "@/lib/labels";
import { useAuth } from "@/lib/authStore";
import { retryVault, useVault } from "@/lib/vault";
import { cn } from "@/lib/utils";
import { ErrorCard } from "./ErrorCard";
import { PhraseCard } from "./PhraseCard";
import { PhraseCardSkeleton } from "./PhraseCardSkeleton";

type Filter = Category | "all";

/**
 * The vault list with its category filter and the three states SPEC.md §6
 * requires: loading (skeletons), empty (an invitation, not an apology), and
 * error (plain statement + retry).
 */
export function VaultList() {
  const vault = useVault();
  const auth = useAuth();
  const [filter, setFilter] = useState<Filter>("all");

  if (vault.status === "loading") {
    return (
      <div className="space-y-3">
        <PhraseCardSkeleton label="Loading saved phrases" />
        <PhraseCardSkeleton label="Loading saved phrases" />
        <PhraseCardSkeleton label="Loading saved phrases" />
      </div>
    );
  }

  if (vault.status === "error") {
    return <ErrorCard message={vault.message} onRetry={retryVault} />;
  }

  if (vault.phrases.length === 0) {
    return (
      <div className="rounded-card border-2 border-dashed border-hairline p-8 text-center">
        <p className="text-body-bold text-ink">Nothing saved yet.</p>
        <p className="text-body mt-2 text-muted">
          Tap the bookmark on any phrase and it lands here, ready even with no signal.
        </p>
        <Link
          href="/"
          className="text-body-bold mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-inverse transition hover:bg-brand-hover motion-reduce:transition-none"
        >
          Browse the phrasebook
        </Link>
      </div>
    );
  }

  // Only categories that actually hold something — including `general`,
  // which has no home tile but is where freeform translations often land.
  const present = CATEGORIES.filter((category) =>
    vault.phrases.some((phrase) => phrase.category === category),
  );
  // If the last phrase in the selected category was removed, fall back to all
  // rather than showing an empty filter.
  const active: Filter = filter !== "all" && present.includes(filter) ? filter : "all";
  const shown =
    active === "all" ? vault.phrases : vault.phrases.filter((p) => p.category === active);

  return (
    <div className="space-y-6">
      {vault.storage === "device" && (
        <p className="text-small text-muted">
          Saved on this device.
          {auth.status === "signed-out" && (
            <>
              {" "}
              <Link href="/account" className="text-ink underline underline-offset-2">
                Sign in
              </Link>{" "}
              to keep them on every device.
            </>
          )}
        </p>
      )}

      {present.length > 1 && (
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <FilterPill selected={active === "all"} onClick={() => setFilter("all")}>
            All
          </FilterPill>
          {present.map((category) => (
            <FilterPill
              key={category}
              selected={active === category}
              onClick={() => setFilter(category)}
            >
              {categoryLabel(category)}
            </FilterPill>
          ))}
        </div>
      )}

      <ul className="space-y-3">
        {shown.map((phrase) => (
          <li key={phrase.id}>
            <PhraseCard phrase={phrase} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterPill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "text-small rounded-full border px-4 py-2 transition motion-reduce:transition-none",
        // Charcoal, not crimson, for the selected pill: SPEC.md §5 keeps
        // crimson to the wordmark, primary actions and eyebrows.
        selected
          ? "border-charcoal bg-charcoal text-inverse"
          : "border-hairline bg-card text-ink hover:border-blush",
      )}
    >
      {children}
    </button>
  );
}
