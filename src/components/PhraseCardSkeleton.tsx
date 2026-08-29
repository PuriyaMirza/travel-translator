/**
 * Loading state for a translation result (SPEC.md §6). Geometry matches
 * `PhraseCard` exactly so the layout doesn't jump when the real card replaces
 * it — same padding, same two-line-plus-caption shape.
 */
export function PhraseCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Translating"
      className="animate-pulse rounded-card border border-hairline bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded-full bg-sand" />
          <div className="h-6 w-4/5 rounded-full bg-sand" />
          <div className="h-3.5 w-1/2 rounded-full bg-sand" />
        </div>
        <div className="size-11 shrink-0 rounded-full bg-sand" />
      </div>
    </div>
  );
}
