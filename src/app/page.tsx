import Link from "next/link";
import { Languages } from "lucide-react";
import { brand } from "@/lib/brand";
import { dailyPhrase } from "@/lib/dailyPhrase";
import { CategoryGrid } from "@/components/CategoryGrid";
import { DailyPhraseCard } from "@/components/DailyPhraseCard";
import { Eyebrow } from "@/components/Eyebrow";

/**
 * Regenerate hourly so the phrase of the day rolls over without a redeploy.
 * The page stays static between regenerations, which is what keeps it usable
 * on a bad connection.
 */
export const revalidate = 3600;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="text-lead text-muted">{brand.tagline}</p>

      <div className="mt-8">
        <DailyPhraseCard phrase={dailyPhrase()} />
      </div>

      <Link
        href="/translate"
        className="text-body-bold mt-6 flex items-center justify-center gap-2 rounded-full border border-hairline bg-card px-6 py-3 text-ink shadow-soft transition hover:border-blush hover:text-brand motion-reduce:transition-none"
      >
        <Languages className="size-5" />
        Translate something else
      </Link>

      <section aria-labelledby="phrasebook" className="mt-10">
        <Eyebrow>Phrasebook</Eyebrow>
        <h2 id="phrasebook" className="text-h1 mt-2 mb-4 font-display text-ink">
          What do you need to say?
        </h2>
        <CategoryGrid />
      </section>
    </main>
  );
}
