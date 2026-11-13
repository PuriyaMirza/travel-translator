import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VISIBLE_CATEGORIES, isCategory } from "@/lib/categories";
import { categoryLabel, momentLabel } from "@/lib/labels";
import { momentsFor } from "@/lib/moments";
import { phrasesForCategory } from "@/lib/phrases";
import type { Phrase } from "@/lib/types";
import { CategoryBanner } from "@/components/CategoryBanner";
import { Eyebrow } from "@/components/Eyebrow";
import { PhraseCard } from "@/components/PhraseCard";

export function generateStaticParams() {
  return VISIBLE_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: PageProps<"/phrasebook/[category]">): Promise<Metadata> {
  const { category } = await params;
  if (!isCategory(category)) return {};
  return { title: categoryLabel(category) };
}

// The app header is 62px plus a 1px rule, under the top safe area. The chip
// row sticks below it, and a group scrolled to by a chip stops below both.
const STICK_BELOW_HEADER = "top-[calc(63px+env(safe-area-inset-top))]";
const SCROLL_BELOW_CHIPS = "scroll-mt-[calc(63px+env(safe-area-inset-top)+80px)]";

export default async function CategoryPage({
  params,
}: PageProps<"/phrasebook/[category]">) {
  const { category } = await params;

  // `general` is a valid slug but has no page — it is the fallback bucket for
  // freeform translations, not a section of the phrasebook (SPEC.md §4).
  if (!isCategory(category) || !VISIBLE_CATEGORIES.includes(category)) {
    notFound();
  }

  const phrases = phrasesForCategory(category);

  // Grouped by moment, in the order moments.ts gives (SPEC.md §14). A phrase
  // with no moment lands in a last, unlabelled group, so a locale that has
  // none still renders as one flat list.
  const groups = momentsFor(category)
    .map((moment) => ({
      moment,
      label: momentLabel(category, moment),
      phrases: phrases.filter((phrase) => phrase.moment === moment),
    }))
    .filter((group) => group.phrases.length > 0);
  const ungrouped = phrases.filter((phrase) => !groups.some((group) => group.moment === phrase.moment));

  return (
    <main className="flex-1 pb-16">
      <CategoryBanner category={category} />

      {groups.length > 1 && (
        <nav
          aria-label={`Jump to a part of ${categoryLabel(category)}`}
          className={`sticky z-[5] mt-6 border-b border-hairline bg-canvas/95 backdrop-blur-sm ${STICK_BELOW_HEADER}`}
        >
          {/* One row that scrolls sideways, so the chips never push the list down. */}
          <ul className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-2.5">
            {groups.map((group) => (
              <li key={group.moment} className="shrink-0">
                <a
                  href={`#${group.moment}`}
                  className="text-small flex min-h-11 items-center rounded-full border border-ink px-4 font-semibold text-ink transition hover:bg-sand/60 motion-reduce:transition-none"
                >
                  {group.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mx-auto mt-6 max-w-3xl space-y-8 px-4">
        {groups.map((group) => (
          <section
            key={group.moment}
            id={group.moment}
            aria-labelledby={`${group.moment}-heading`}
            className={`space-y-3 ${SCROLL_BELOW_CHIPS}`}
          >
            <Eyebrow as="h2" id={`${group.moment}-heading`}>
              {group.label}
            </Eyebrow>
            <PhraseList phrases={group.phrases} />
          </section>
        ))}

        {ungrouped.length > 0 && <PhraseList phrases={ungrouped} />}

        {phrases.length === 0 && (
          <p className="rounded-card border border-dashed border-hairline p-8 text-center text-muted">
            No phrases here yet. Try another section of the phrasebook.
          </p>
        )}
      </div>
    </main>
  );
}

function PhraseList({ phrases }: { phrases: Phrase[] }) {
  return (
    <ul className="space-y-3">
      {phrases.map((phrase) => (
        <li key={phrase.id}>
          <PhraseCard phrase={phrase} />
        </li>
      ))}
    </ul>
  );
}
