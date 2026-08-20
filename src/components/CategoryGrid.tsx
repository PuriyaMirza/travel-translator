import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { VISIBLE_CATEGORIES } from "@/lib/categories";
import { categoryMeta } from "@/lib/categoryMeta";
import { categoryLabel } from "@/lib/labels";
import { phrasesForCategory } from "@/lib/phrases";

/**
 * The 2-column category grid on home (SPEC.md §6).
 *
 * Driven off VISIBLE_CATEGORIES, so `general` never grows a tile by accident.
 */
export function CategoryGrid() {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {VISIBLE_CATEGORIES.map((category) => {
        const { icon: Icon, wash } = categoryMeta(category);
        const count = phrasesForCategory(category).length;

        return (
          <li key={category}>
            <Link
              href={`/phrasebook/${category}`}
              className="rounded-card group flex h-full flex-col justify-between gap-6 border border-hairline bg-card p-4 shadow-soft transition duration-100 hover:-translate-y-0.5 hover:border-blush active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span
                aria-hidden
                className="rounded-image flex size-11 items-center justify-center"
                style={{ backgroundImage: wash }}
              >
                <Icon className="size-5 text-ink/70" />
              </span>

              <span>
                <span className="text-body-bold flex items-center gap-1 text-ink">
                  {categoryLabel(category)}
                  <ChevronRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand motion-reduce:transition-none" />
                </span>
                <span className="text-small block text-muted">{count} phrases</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
