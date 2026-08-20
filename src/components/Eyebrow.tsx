import { cn } from "@/lib/utils";

/**
 * The small uppercase label above a title — e.g. "PHRASEBOOK: TRANSIT".
 *
 * Uppercasing lives here rather than in the `text-eyebrow` token so that a
 * callsite can still opt out; see the note in globals.css.
 */
export function Eyebrow({
  children,
  tone = "brand",
  className,
}: {
  children: React.ReactNode;
  tone?: "brand" | "muted";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-eyebrow uppercase",
        tone === "brand" ? "text-brand" : "text-muted",
        className,
      )}
    >
      {children}
    </p>
  );
}
