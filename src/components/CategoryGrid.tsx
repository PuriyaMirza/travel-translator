import Link from "next/link";
import { VISIBLE_CATEGORIES } from "@/lib/categories";
import { categoryMeta } from "@/lib/categoryMeta";
import { categoryLabel } from "@/lib/labels";

/**
 * The 2-column category grid on home (SPEC.md §6): compact outlined tiles,
 * icon + label (Stamp blues design).
 *
 * Driven off VISIBLE_CATEGORIES, so `general` never grows a tile by accident.
 */
export function CategoryGrid() {
  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {VISIBLE_CATEGORIES.map((category) => {
        const { icon: Icon } = categoryMeta(category);

        return (
          <li key={category}>
            <Link
              href={`/phrasebook/${category}`}
              className="flex h-full items-center gap-2.5 rounded-tile border border-ink p-3.5 text-ink transition duration-100 hover:bg-sand/60 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 text-[13px] leading-[17px] font-semibold">
                {categoryLabel(category)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
