import { cn } from "@/lib/utils";

/**
 * The small uppercase label above a title — e.g. "PHRASEBOOK: TRANSIT".
 *
 * Brand-tone eyebrows lead with a short near-black rule (Stamp blues design).
 * `as="h2"` lets an eyebrow be the section heading itself, which is how the
 * home screen labels its sections ("SITUATIONS") with no title under them.
 *
 * Uppercasing lives here rather than in the `text-eyebrow` token so that a
 * callsite can still opt out; see the note in globals.css.
 */
export function Eyebrow({
  children,
  tone = "brand",
  rule = tone === "brand",
  as: Tag = "p",
  id,
  className,
}: {
  children: React.ReactNode;
  tone?: "brand" | "muted";
  rule?: boolean;
  as?: "p" | "h2";
  id?: string;
  className?: string;
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "text-eyebrow uppercase",
        rule && "flex items-center gap-2.5",
        tone === "brand" ? "text-brand" : "text-muted",
        className,
      )}
    >
      {rule && <span aria-hidden className="h-0.5 w-5 shrink-0 bg-rule" />}
      {children}
    </Tag>
  );
}
