import { categoryMeta } from "@/lib/categoryMeta";
import { categoryLabel } from "@/lib/labels";
import type { Category } from "@/lib/categories";
import { Eyebrow } from "./Eyebrow";

/**
 * The editorial header of a category page (SPEC.md §5): full-bleed banner,
 * eyebrow, title, and a light airy lead. The dense, scannable phrase list
 * lives below it — the look is editorial, the interaction is fast.
 *
 * The banner is a palette wash standing in for photography; see the note on
 * `wash` in categoryMeta.ts.
 */
export function CategoryBanner({ category }: { category: Category }) {
  const { icon: Icon, wash, lead } = categoryMeta(category);

  return (
    <header>
      <div
        aria-hidden
        className="relative flex h-40 items-center justify-center sm:h-52"
        style={{ backgroundImage: wash }}
      >
        <Icon className="size-16 text-ink/15" strokeWidth={1.25} />
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8">
        <Eyebrow>Phrasebook: {categoryLabel(category)}</Eyebrow>
        <h1 className="text-display mt-2 font-display text-ink">
          {categoryLabel(category)}
        </h1>
        <p className="text-lead mt-4 text-muted">{lead}</p>
      </div>
    </header>
  );
}
