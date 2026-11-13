"use client";

import Link from "next/link";
import { ChevronRight, Maximize2, Plane } from "lucide-react";
import { destinationName } from "@/lib/destinations";
import { SHOW_CARD_KIND_LABELS } from "@/lib/labels";
import { useSavedPhrases } from "@/lib/local/savedPhrases";
import { useLocalSettings } from "@/lib/local/settings";
import { useShowCards } from "@/lib/local/showCards";
import { useTripPacks } from "@/lib/local/tripPacks";
import { travelMonthLabel } from "@/lib/onboarding";
import { SHOW_CARD_KIND_META } from "@/lib/showCardMeta";
import { SHOW_CARD_KINDS } from "@/lib/types";
import { ShowTrigger } from "./ShowTrigger";

/** How many of each the card shows; the rest are one tap away. */
const SHOWN = 3;

const rowClass =
  "flex items-center gap-3 rounded-tile border border-ink bg-card px-4 py-3 text-ink transition hover:bg-card/60 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

/**
 * The mint feature card on Home (SPEC.md §14): this traveller's own show
 * cards and trip phrases, one tap from being shown. It replaced the Daily
 * Phrase card, which taught a phrase a day — a language-learning pattern the
 * app is not (SPEC.md §1).
 *
 * Everything comes from IndexedDB, so it works offline and signed out. It
 * also carries the trip from onboarding, which used to be its own row.
 */
export function YourTripCard({ locale }: { locale: string }) {
  const settings = useLocalSettings();
  const { state: cardState } = useShowCards();
  const { state: savedState } = useSavedPhrases();
  const tripPacks = useTripPacks();

  const loading = settings === null || cardState.status === "loading" || savedState.status === "loading";

  const country = settings?.destination ? destinationName(locale, settings.destination) : undefined;
  const month = settings?.travelMonth ? travelMonthLabel(settings.travelMonth) : undefined;
  const trip = country ? (month ? `${country} · ${month}` : country) : undefined;

  const cards = cardState.status === "ready" ? cardState.cards : [];
  const saved = savedState.status === "ready" ? savedState.phrases : [];
  // The newest pack that still has a phrase on this device.
  const pack = [...tripPacks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find((p) => saved.some((phrase) => phrase.tripPackId === p.id));
  const packPhrases = pack ? saved.filter((phrase) => phrase.tripPackId === pack.id) : [];

  return (
    <section
      aria-labelledby="your-trip"
      aria-busy={loading}
      className="flex min-h-[236px] flex-col gap-4 rounded-card bg-sand p-[22px] text-ink"
    >
      <div className="flex items-center justify-between gap-3 text-[11px] leading-normal">
        <h2 id="your-trip" className="font-semibold tracking-[0.14em] uppercase">
          (01) Your trip
        </h2>
        {trip && <p className="text-right font-medium tracking-[0.06em]">{trip}</p>}
      </div>

      {loading ? (
        <div aria-hidden className="flex flex-1 animate-pulse flex-col gap-3 motion-reduce:animate-none">
          <div className="h-[50px] rounded-tile bg-ink/10" />
          <div className="h-[50px] rounded-tile bg-ink/10" />
          <div className="h-[50px] rounded-tile bg-ink/10" />
        </div>
      ) : (
        <>
          <Block label="Cards to show">
            {cards.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {cards.slice(0, SHOWN).map((card) => {
                  const Icon = SHOW_CARD_KIND_META[card.kind].icon;
                  return (
                    <li key={card.id}>
                      <Link
                        href={`/cards/${card.id}`}
                        aria-label={`Show "${card.title}" full screen`}
                        className={rowClass}
                      >
                        <Icon aria-hidden className="size-[18px] shrink-0" />
                        <span className="text-body-bold min-w-0 flex-1 truncate">{card.title}</span>
                        <Maximize2 aria-hidden className="size-4 shrink-0" />
                      </Link>
                    </li>
                  );
                })}
                {cards.length > SHOWN && (
                  <li>
                    <MoreLink href="/cards">All {cards.length} cards</MoreLink>
                  </li>
                )}
              </ul>
            ) : (
              <>
                <p className="text-small">
                  For an allergy, a medication or your address: write it once, then hand over the phone.
                </p>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {SHOW_CARD_KINDS.map((kind) => {
                    const Icon = SHOW_CARD_KIND_META[kind].icon;
                    return (
                      <li key={kind}>
                        <Link
                          href={`/cards/new?kind=${kind}`}
                          className="text-small flex min-h-11 items-center gap-2 rounded-full border border-ink bg-card px-4 font-semibold transition hover:bg-card/60 motion-reduce:transition-none"
                        >
                          <Icon aria-hidden className="size-4" />
                          {SHOW_CARD_KIND_LABELS.en[kind]}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Block>

          <Block label={pack ? pack.title : "Phrases for this trip"}>
            {pack ? (
              <>
                <ul className="divide-y divide-ink/20">
                  {packPhrases.slice(0, SHOWN).map((phrase) => (
                    <li key={phrase.id} className="py-1.5">
                      <ShowTrigger phrase={phrase}>
                        <span lang={phrase.locale} className="block text-[15px] leading-5 font-bold">
                          {phrase.natural}
                        </span>
                        <span className="block text-[13px] leading-[18px]">{phrase.sourceText}</span>
                      </ShowTrigger>
                    </li>
                  ))}
                </ul>
                <MoreLink href={`/vault?trip=${pack.id}`}>
                  All {packPhrases.length} {packPhrases.length === 1 ? "phrase" : "phrases"} from this trip
                </MoreLink>
              </>
            ) : (
              <Link href="/trip" className={rowClass}>
                <Plane aria-hidden className="size-[18px] shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-body-bold block">
                    {country ? `Get phrases for ${country}` : "Get phrases for your trip"}
                  </span>
                  <span className="text-small block">Describe the trip; save the phrases for offline.</span>
                </span>
                <ChevronRight aria-hidden className="size-[18px] shrink-0" />
              </Link>
            )}
          </Block>
        </>
      )}
    </section>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="truncate text-[10px] font-semibold tracking-[0.14em] uppercase">{label}</h3>
      {children}
    </div>
  );
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-small mt-1 inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4"
    >
      {children}
      <ChevronRight aria-hidden className="size-4" />
    </Link>
  );
}
