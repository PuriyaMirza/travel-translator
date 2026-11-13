import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { brand } from "./brand";
import { isCategory } from "./categories";
import { destinationName } from "./destinations";
import { localeName } from "./locale";
import { DEFAULT_TRAVELLER, type Traveller } from "./traveller";
import type { LikelyReply, Phrase, SpanishComfort, SpeakerGender } from "./types";

/**
 * The translation backend (SPEC.md §8). Never imported by a client component —
 * `ANTHROPIC_API_KEY` stays server-side (SPEC.md §2 rule 6). Only the route
 * handlers (`api/translate`, and `api/trip-pack` via `tripPack.ts`) may import
 * this file; that boundary is
 * verified by grepping the built client bundle for the SDK and the key (see
 * BUILDLOG.md), rather than adding the `server-only` package for one file.
 */

// An identity-linked API key must name the workspace each request acts in,
// or the API rejects it with a 400 before it looks at anything else. A plain
// API key needs no such header, so this is conditional rather than required:
// set ANTHROPIC_WORKSPACE_ID alongside the key when the key is
// identity-linked, leave it unset otherwise. Spelled as a default header
// because the SDK exposes no dedicated option for it.
const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;

export const client = new Anthropic(
  workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {},
);

// SPEC.md §3 pins this for the app's runtime translation calls. It is not a
// cost default: §3 draws the line deliberately between the product's
// per-request hot path and the coding agents that build this repo, which run
// on Opus and imply nothing about what the shipped app calls. Do not
// "upgrade" this because a coding session happens to run on a bigger model —
// raise EFFORT and measure first. No date suffix: IDs in this family carry
// none, and appending one yields a model that doesn't exist.
export const MODEL = "claude-sonnet-5";

// Sampling parameters (temperature/top_p/top_k) are removed on current
// models and return a 400 — SPEC.md §8's original "temperature around 0.3"
// doesn't apply to the current API. Consistency instead comes from a tight
// prompt plus structured outputs, with a low effort level: this is a short,
// well-specified transformation, not a task that benefits from deep
// reasoning.
export const EFFORT = "low";

// SPEC.md §8. Thinking tokens count toward max_tokens and adaptive thinking
// is on unless explicitly disabled, so this budgets thinking *plus* answer,
// not just the JSON. The original ~1024 was sized as if the response were
// the only output; at EFFORT "low" thinking is short, but 1024 leaves no
// margin and truncation arrives as an incomplete structured output. 4096 is
// headroom rather than a target — unused capacity is free, since output
// bills on tokens actually generated — and stays well clear of the point
// where the SDK wants streaming to dodge HTTP timeouts, so the route handler
// stays a plain non-streaming request.
const MAX_TOKENS = 4096;

export const TranslationSchema = z.object({
  sourceText: z.string(),
  sourceLanguage: z.enum(["en", "es"]),
  targetLanguage: z.enum(["en", "es"]),
  literal: z.string(),
  natural: z.string(),
  // Deliberately a plain string, not z.enum(CATEGORIES): isCategory() below
  // validates it at runtime instead. This is exactly the bug class SPEC.md
  // §2 rule 3 exists to prevent — a category string the model produces that
  // doesn't match a canonical slug — and it needs a runtime fallback, not
  // just a schema that would reject the whole response over one bad field.
  category: z.string(),
  // Rule 5: empty string when there's nothing worth noting, never omitted.
  culturalNote: z.string(),
  pronunciation: z.string(),
  // SPEC.md §14. Always present; an empty array is the "expects no reply"
  // value. The count is capped in normalizeReplies(), not here: array limits
  // would only reach the model as description text.
  likelyReplies: z.array(z.object({ text: z.string(), meaning: z.string() })),
});

/** At most this many replies on a single translation; a trip pack keeps fewer. */
export const MAX_REPLIES = 3;

/** Drop blank replies and cap the count. Undefined when none are left. */
export function normalizeReplies(
  raw: z.infer<typeof TranslationSchema>["likelyReplies"],
  max: number,
): LikelyReply[] | undefined {
  const replies = raw
    .map((r) => ({ text: r.text.trim(), meaning: r.meaning.trim() }))
    .filter((r) => r.text && r.meaning)
    .slice(0, max);
  return replies.length > 0 ? replies : undefined;
}

/**
 * The prompt rules the translate prompt (SPEC.md §8) and the trip-pack prompt
 * (SPEC.md §13) share. One copy, so the two cannot drift. Each template adds
 * its own numbering; the text is the same word for word.
 *
 * Continuation lines carry their own indent so a rule drops into a numbered
 * list unchanged.
 */
export const sharedPromptRules = {
  literalAndNatural: `Give a "literal" translation (correct, neutral, safe in formal settings)
   and a "natural" translation (what a native speaker would really say).`,
  neutralSpanish: `Use neutral Latin American Spanish. No vosotros. Avoid strong regional
   slang unless the input itself is slang.`,
  pronunciation: `Pronunciation guides use Latin American sounds: seseo (c/z = s, never
   "th"), ll and y as a soft "y" sound. Write them so an English speaker
   reading aloud phonetically will be understood. If the input is Spanish and
   the output is English, write a plain phonetic guide for the English
   instead.`,
  culturalNote: `Fill culturalNote only when there is something a traveler would
   genuinely get wrong — a politeness convention, a false friend, a word
   that means something different here. Otherwise leave it as an empty
   string. Do not pad it.`,
  category: `category must be exactly one of: greetings, dining, transit, shopping,
   lodging, emergency, general. Use general when nothing else fits.`,
  speakerGender: (speakerGender: SpeakerGender) =>
    `When the speaker refers to themselves, use ${speakerGender} grammatical
   agreement. If it is neutral, prefer constructions that avoid gendered
   agreement — "Tengo alergia a…" rather than "Soy alérgico a…" — and use
   the masculine form only where no natural neutral phrasing exists.`,
  // SPEC.md §14 "Likely replies".
  likelyReplies: (max: number) =>
    `Fill likelyReplies with up to ${max} short things the other person is
   likely to say back, most likely first: "text" in Spanish as it would be
   spoken, "meaning" in English. Only replies a stranger in that situation
   would plausibly give. Use an empty array when the output is English, or
   when the phrase expects no reply.`,
  // SPEC.md §14. The name comes from destinations.ts, never from the request.
  destination: (name: string) =>
    `The traveler is going to ${name}. Keep "literal" neutral. In "natural",
   where people in ${name} use a different everyday word or phrase from the
   neutral one, use theirs, and say so in culturalNote in one sentence. Change
   a word only when the neutral one would sound foreign or be misunderstood
   there; do not add regional slang for colour.`,
  comfort: {
    none: `The traveler speaks no Spanish and will read "natural" aloud from the
   pronunciation guide. Prefer the shortest phrasing that is still polite, and
   where two phrasings are equally natural pick the one an English speaker
   finds easier to pronounce.`,
    basic: undefined,
    conversational: `The traveler can hold a conversation in Spanish. "natural" may be
   fuller and more idiomatic, and culturalNote may mention register.`,
  } satisfies Record<SpanishComfort, string | undefined>,
};

/**
 * The rules that depend on the traveller's onboarding answers (SPEC.md §14),
 * numbered from `start`, or an empty string when there are none. Shared by
 * the translate and trip-pack prompts.
 */
export function travellerRules(locale: string, traveller: Traveller, start: number): string {
  const rules: string[] = [];
  const name = traveller.destination && destinationName(locale, traveller.destination);
  if (name) rules.push(sharedPromptRules.destination(name));
  const comfort = traveller.spanishComfort && sharedPromptRules.comfort[traveller.spanishComfort];
  if (comfort) rules.push(comfort);
  return rules.map((rule, i) => `\n${start + i}. ${rule}`).join("");
}

function buildSystemPrompt(locale: string, traveller: Traveller): string {
  return `You are an expert linguist specializing in ${localeName(locale)} as spoken in
everyday life. You are the translation backend for a travel phrasebook app.

Given input text, produce a contextual translation that reflects how a
native speaker actually talks — not textbook or Castilian phrasing.

Rules:
1. Detect whether the input is English or Spanish; translate to the other.
2. ${sharedPromptRules.literalAndNatural}
3. ${sharedPromptRules.neutralSpanish}
4. ${sharedPromptRules.pronunciation}
5. ${sharedPromptRules.culturalNote}
6. ${sharedPromptRules.category}
7. ${sharedPromptRules.speakerGender(traveller.speakerGender)}
8. ${sharedPromptRules.likelyReplies(MAX_REPLIES)}${travellerRules(locale, traveller, 9)}

Examples:

Input: "Could I see the menu?"
Output: sourceLanguage "en", targetLanguage "es", literal "¿Podría ver el
menú?", natural "¿Me da el menú, por favor?", pronunciation "meh dah ehl
meh-NOO, por fah-VOR", category "dining", culturalNote "", likelyReplies
[{text "Aquí tiene.", meaning "Here you go."}, {text "Enseguida se lo
traigo.", meaning "I'll bring it right away."}].

Input: "¿Dónde tomo el autobús?"
Output: sourceLanguage "es", targetLanguage "en", literal "Where do I catch
the bus?", natural "Where do I catch the bus?", pronunciation "WEHR doo eye
kach thuh buhs", category "transit", culturalNote "", likelyReplies [].

Input: "Estoy full"
Output: sourceLanguage "es", targetLanguage "en", literal "I am full",
natural "I'm stuffed", pronunciation "eem stuhft", category "dining",
culturalNote "Full here means physically full from eating, not the English
sense of complete — a common false friend for English speakers.",
likelyReplies [].`;
}

export interface TranslateError {
  code: "empty" | "too_long" | "rate_limited" | "upstream" | "unknown";
  message: string;
}

export class TranslationRequestError extends Error {
  readonly info: TranslateError;

  constructor(info: TranslateError) {
    super(info.message);
    this.info = info;
  }
}

const MAX_INPUT_LENGTH = 500;

/**
 * Normalises the model's raw output into the same `Phrase` shape the
 * phrasebook already renders. Exported as a pure function so it can be unit
 * tested without a network call — see the verification notes in BUILDLOG.md.
 */
export function normalizeTranslation(
  parsed: z.infer<typeof TranslationSchema>,
  locale: string,
): Phrase {
  return {
    id: crypto.randomUUID(),
    locale,
    sourceText: parsed.sourceText,
    literal: parsed.literal,
    natural: parsed.natural,
    culturalNote: parsed.culturalNote.trim() || undefined,
    pronunciation: parsed.pronunciation,
    category: isCategory(parsed.category) ? parsed.category : "general",
    targetLanguage: parsed.targetLanguage,
    // Replies only make sense for something the traveller says in Spanish.
    replies: parsed.targetLanguage === "es" ? normalizeReplies(parsed.likelyReplies, MAX_REPLIES) : undefined,
  };
}

export async function translate(
  text: string,
  traveller: Traveller = DEFAULT_TRAVELLER,
): Promise<Phrase> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new TranslationRequestError({ code: "empty", message: "Type something to translate." });
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    throw new TranslationRequestError({
      code: "too_long",
      message: `Keep it under ${MAX_INPUT_LENGTH} characters — this is a phrase, not a document.`,
    });
  }

  const locale = brand.defaultLocale;

  let response;
  try {
    response = await client.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(locale, traveller),
      messages: [{ role: "user", content: trimmed }],
      output_config: {
        format: zodOutputFormat(TranslationSchema),
        effort: EFFORT,
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new TranslationRequestError({
        code: "rate_limited",
        message: "Too many translations right now — wait a moment and try again.",
      });
    }
    if (error instanceof Anthropic.APIError) {
      // Never surface the provider's name or raw message to the client
      // (SPEC.md §6). The real error is logged here, server-side, for
      // debugging; the client gets a generic, honest statement instead.
      console.error("Translation upstream error:", error);
      throw new TranslationRequestError({
        code: "upstream",
        message: "The translation service is unavailable right now.",
      });
    }
    console.error("Translation failed:", error);
    throw new TranslationRequestError({
      code: "unknown",
      message: "Something went wrong. Try again.",
    });
  }

  if (!response.parsed_output) {
    console.error("Translation response failed schema validation:", response);
    throw new TranslationRequestError({
      code: "unknown",
      message: "Something went wrong. Try again.",
    });
  }

  return normalizeTranslation(response.parsed_output, locale);
}
