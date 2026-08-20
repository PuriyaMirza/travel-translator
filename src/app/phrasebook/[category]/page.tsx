import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VISIBLE_CATEGORIES, isCategory } from "@/lib/categories";
import { categoryLabel } from "@/lib/labels";
import { phrasesForCategory } from "@/lib/phrases";
import { CategoryBanner } from "@/components/CategoryBanner";
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

  return (
    <main className="flex-1 pb-16">
      <CategoryBanner category={category} />

      <div className="mx-auto mt-8 max-w-3xl px-4">
        {phrases.length > 0 ? (
          <ul className="space-y-3">
            {phrases.map((phrase) => (
              <li key={phrase.id}>
                <PhraseCard phrase={phrase} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-dashed border-hairline p-8 text-center text-muted">
            No phrases here yet. Try another section of the phrasebook.
          </p>
        )}
      </div>
    </main>
  );
}
