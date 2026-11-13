import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { isCategory } from "./categories";
import { localeName } from "./locale";
import { PRESET_PHRASES } from "./phrases";
import { blankSlot } from "./slot";
import { destinationName } from "./destinations";
import {
  client,
  EFFORT,
  MODEL,
  normalizeReplies,
  sharedPromptRules,
  TranslationSchema,
  travellerRules,
} from "./translate";
import { travelMonthName, type Traveller } from "./traveller";
import type { Phrase } from "./types";

/**
 * The trip-pack backend (SPEC.md §13). Server-only, like `translate.ts`, whose
 * client, model, effort and prompt rules it shares. Only
 * `src/app/api/trip-pack/route.ts` imports this file.
 */

export const TRIP_TITLE_MAX = 60;
export const TRIP_DESCRIPTION_MAX = 500;

/** The prompt asks for this many; anything beyond is truncated. */
export const TRIP_PACK_SIZE = 25;
/**
 * Replies per phrase in a pack (SPEC.md §14): fewer than a single translation
 * gets, because 25 phrases already make this the slowest request in the app.
 */
export const TRIP_PACK_REPLIES = 2;
/** Fewer than this is an error state, not a short pack. */
export const TRIP_PACK_MIN = 10;

// SPEC.md §13. Thinking tokens count toward max_tokens (see translate.ts), so
// this budgets thinking plus ~25 phrases at ~150 tokens each. Still a plain
// non-streaming request.
const MAX_TOKENS = 16000;

// The SDK default is two retries on a ten-minute timeout, which would blow
// straight past the route's maxDuration (300s). One attempt, cut off before it.
const REQUEST_OPTIONS = { timeout: 240_000, maxRetries: 0 };

// The items are SPEC.md §8's response shape, unchanged. `.max()`/`.min()` on
// the array would only reach the model as description text, so the limits are
// enforced in `normalizeTripPack` instead.
const TripPackSchema = z.object({ phrases: z.array(TranslationSchema) });

function buildTripPackPrompt(locale: string, traveller: Traveller): string {
  const presets = PRESET_PHRASES.map((p) => `- ${blankSlot(p.sourceText)}`).join("\n");

  return `You are an expert linguist specializing in ${localeName(locale)} as spoken in
everyday life. You are the phrase-pack backend for a travel phrasebook app.

The traveler describes a trip in plain English. Write ${TRIP_PACK_SIZE} phrases
they are likely to need on that trip, each translated the way a native speaker
actually talks — not textbook or Castilian phrasing.

Rules:
1. Every phrase is something the traveler will say or show: English source,
   Spanish target. Every phrase has sourceLanguage "en" and targetLanguage "es".
2. ${sharedPromptRules.literalAndNatural}
3. ${sharedPromptRules.neutralSpanish}
4. ${sharedPromptRules.pronunciation}
5. ${sharedPromptRules.culturalNote}
6. ${sharedPromptRules.category}
7. ${sharedPromptRules.speakerGender(traveller.speakerGender)}
8. Be specific to the described trip, not a generic phrasebook. A vegetarian
   gets "Does this have meat broth in it?", not "Where is the bathroom?"
9. Do not repeat the phrases the app already ships. These are already covered:
${presets}
10. Spread phrases across categories only as far as the trip warrants. Do not
   pad a category to balance the set.
11. ${sharedPromptRules.likelyReplies(TRIP_PACK_REPLIES)}${travellerRules(locale, traveller, 12)}

Example, for a trip described as "vegetarian, two weeks in Mexico City":

sourceText "Does this have meat broth in it?", sourceLanguage "en",
targetLanguage "es", literal "¿Esto tiene caldo de carne?", natural "¿Esto
lleva caldo de carne?", pronunciation "EH-sto YEH-vah KAL-do deh KAR-neh",
category "dining", culturalNote "Many soups and rice dishes are made with meat
stock even when no meat is visible, so ask about the broth as well as the
ingredients.", likelyReplies [{text "Sí, lleva caldo de pollo.", meaning "Yes,
it has chicken broth."}, {text "No, es solo verdura.", meaning "No, it's only
vegetables."}]`;
}

export interface TripPackError {
  code: "invalid" | "rate_limited" | "too_few" | "upstream" | "unknown";
  message: string;
}

export class TripPackRequestError extends Error {
  readonly info: TripPackError;

  constructor(info: TripPackError) {
    super(info.message);
    this.info = info;
  }
}

const UPSTREAM_MESSAGE = "Building the trip pack didn't finish. Try again in a moment.";
const TOO_FEW_MESSAGE =
  "Couldn't build a full pack. Try again, or add more detail about your trip.";

/**
 * Turns the model's raw phrases into the `Phrase` shape the phrasebook
 * renders. Pure, so it can be checked without a network call.
 *
 * - `sourceLanguage` is forced to English (the schema leaves it free, the
 *   prompt asks for "en"); `targetLanguage` follows as Spanish.
 * - `category` falls back to `general` through `isCategory()`, exactly as
 *   `/api/translate` does.
 * - Blank phrases and repeats of the same sourceText are dropped before
 *   counting, so a padded response can't pass the minimum.
 * - More than TRIP_PACK_SIZE is truncated; fewer than TRIP_PACK_MIN throws.
 * - Every phrase gets the request's locale and a fresh id.
 */
export function normalizeTripPack(
  parsed: z.infer<typeof TripPackSchema>,
  locale: string,
): Phrase[] {
  const seen = new Set<string>();
  const phrases: Phrase[] = [];

  for (const item of parsed.phrases) {
    const key = item.sourceText.trim().toLowerCase();
    if (!key || !item.natural.trim() || seen.has(key)) continue;
    seen.add(key);

    phrases.push({
      id: crypto.randomUUID(),
      locale,
      sourceText: item.sourceText.trim(),
      literal: item.literal,
      natural: item.natural,
      culturalNote: item.culturalNote.trim() || undefined,
      pronunciation: item.pronunciation,
      category: isCategory(item.category) ? item.category : "general",
      targetLanguage: "es",
      replies: normalizeReplies(item.likelyReplies, TRIP_PACK_REPLIES),
    });
  }

  if (phrases.length < TRIP_PACK_MIN) {
    throw new TripPackRequestError({ code: "too_few", message: TOO_FEW_MESSAGE });
  }
  return phrases.slice(0, TRIP_PACK_SIZE);
}

/**
 * The user turn. The destination and month from onboarding (SPEC.md §14) go
 * in as facts about the trip, ahead of the traveller's own words; both are
 * resolved from validated values, never copied from the request.
 */
export function tripPackUserMessage(
  title: string,
  description: string,
  locale: string,
  traveller: Traveller,
): string {
  const lines = [`Trip: ${title}`];
  const country = traveller.destination && destinationName(locale, traveller.destination);
  if (country) lines.push(`Destination: ${country}`);
  const month = traveller.travelMonth && travelMonthName(traveller.travelMonth);
  if (month) lines.push(`Travelling: ${month}`);
  return `${lines.join("\n")}\n\n${description}`;
}

export async function generateTripPack(
  title: string,
  description: string,
  locale: string,
  traveller: Traveller,
): Promise<Phrase[]> {
  let response;
  try {
    response = await client.messages.parse(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildTripPackPrompt(locale, traveller),
        messages: [{ role: "user", content: tripPackUserMessage(title, description, locale, traveller) }],
        output_config: {
          format: zodOutputFormat(TripPackSchema),
          effort: EFFORT,
        },
      },
      REQUEST_OPTIONS,
    );
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new TripPackRequestError({
        code: "rate_limited",
        message: "Too many requests right now — wait a moment and try again.",
      });
    }
    // Never surface the provider's name or raw message to the client
    // (SPEC.md §6); the real error is logged server-side.
    console.error("Trip pack failed:", error);
    throw new TripPackRequestError({ code: "upstream", message: UPSTREAM_MESSAGE });
  }

  // A truncated or refused response can't match the schema; both mean the
  // pack didn't get built, not that the traveler's input was wrong.
  if (!response.parsed_output || response.stop_reason === "max_tokens" || response.stop_reason === "refusal") {
    console.error("Trip pack response unusable:", response.stop_reason, response);
    throw new TripPackRequestError({ code: "upstream", message: UPSTREAM_MESSAGE });
  }

  return normalizeTripPack(response.parsed_output, locale);
}
