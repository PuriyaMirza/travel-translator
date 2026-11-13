import Link from "next/link";
import { ArrowRight, Languages } from "lucide-react";
import { brand } from "@/lib/brand";
import { ESSENTIAL_PHRASES } from "@/lib/essentials";
import { localeLabel } from "@/lib/labels";
import { CategoryGrid } from "@/components/CategoryGrid";
import { EssentialPhrases } from "@/components/EssentialPhrases";
import { Eyebrow } from "@/components/Eyebrow";
import { OnboardingGate } from "@/components/OnboardingGate";
import { YourTripCard } from "@/components/YourTripCard";

/**
 * Home (Figma: Language App › "Stamp blues palette · A Light editorial · Home").
 * Order: eyebrow, title, translate entry, essentials, your trip, situations.
 * The essentials list is not in the Figma frame; it sits above the feature
 * card because it is what someone mid-conversation needs first. The mint
 * feature card is "Your trip" (SPEC.md §14), which replaced the daily phrase.
 * Nothing on this page depends on the date or the network, so it is static.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-[18px] px-5 pt-[22px] pb-8">
      <OnboardingGate />
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

      <EssentialPhrases phrases={ESSENTIAL_PHRASES} />

      <YourTripCard locale={brand.defaultLocale} />

      <section aria-labelledby="situations" className="space-y-[18px]">
        <Eyebrow as="h2" id="situations">
          Situations
        </Eyebrow>
        <CategoryGrid />
      </section>
    </main>
  );
}
