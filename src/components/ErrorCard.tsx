import { RotateCw } from "lucide-react";

/**
 * The error state (SPEC.md §6): a crimson-tinted card, a plain statement of
 * what failed and how to fix it, and a retry button. No apology, and the
 * message must never name the AI provider — callers are responsible for
 * passing copy that already meets that bar (see `translate.ts`).
 */
export function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-card border border-blush bg-brand/5 p-5">
      <p className="text-body text-ink">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-body-bold mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-inverse transition hover:bg-brand-hover active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <RotateCw className="size-4" />
        Try again
      </button>
    </div>
  );
}
