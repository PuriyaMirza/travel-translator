import Link from "next/link";
import { ArrowRight, Languages, ScanText } from "lucide-react";
import { brand } from "@/lib/brand";
import { dailyPhrase } from "@/lib/dailyPhrase";
import { ESSENTIAL_PHRASES } from "@/lib/essentials";
import { localeLabel } from "@/lib/labels";
import { CategoryGrid } from "@/components/CategoryGrid";
import { DailyPhraseCard } from "@/components/DailyPhraseCard";
import { EssentialPhrases } from "@/components/EssentialPhrases";
import { Eyebrow } from "@/components/Eyebrow";

/**
 * Regenerate hourly so the phrase of the day rolls over without a redeploy.
 * The page stays static between regenerations, which is what keeps it usable
 * on a bad connection.
 */
export const revalidate = 3600;

/** MM.DD.YYYY in UTC — the same day `dailyPhrase()` picks by. */
function formatDailyDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}.${now.getUTCFullYear()}`;
}

/**
 * Home (Figma: Language App › "Stamp blues palette · A Light editorial · Home").
 * Order: eyebrow, title, translate entry, essentials, daily phrase, situations.
 * The essentials list is not in the Figma frame; it sits above the daily phrase
 * because it is what someone mid-conversation needs first.
 */
export default function Home() {
  const now = new Date();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-[18px] px-5 pt-[22px] pb-8">
      <Eyebrow>Phrasebook · {localeLabel(brand.defaultLocale)}</Eyebrow>

      <h1 className="text-display font-display text-ink">{brand.tagline}</h1>

      <Link
        href="/translate"
        className="flex items-center gap-3 rounded-full border border-ink px-[18px] py-[15px] text-ink transition hover:bg-sand/60 motion-reduce:transition-none"
      >
        <Languages aria-hidden className="size-[18px] shrink-0" />
        <span className="min-w-0 flex-1 text-[15px]">Type anything to translate…</span>
        <ArrowRight aria-hidden className="size-[18px] shrink-0" />
      </Link>

      <Link
        href="/menu"
        className="flex items-center gap-3 rounded-full border border-ink px-[18px] py-[15px] text-ink transition hover:bg-sand/60 motion-reduce:transition-none"
      >
        <ScanText aria-hidden className="size-[18px] shrink-0" />
        <span className="min-w-0 flex-1 text-[15px]">Scan a menu</span>
        <ArrowRight aria-hidden className="size-[18px] shrink-0" />
      </Link>

      <EssentialPhrases phrases={ESSENTIAL_PHRASES} />

      <DailyPhraseCard phrase={dailyPhrase(now)} date={formatDailyDate(now)} />

      <section aria-labelledby="situations" className="space-y-[18px]">
        <Eyebrow as="h2" id="situations">
          Situations
        </Eyebrow>
        <CategoryGrid />
      </section>
    </main>
  );
}
