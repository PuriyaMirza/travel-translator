import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { brand } from "./brand";
import { isCategory } from "./categories";
import { localeName } from "./locale";
import type { Phrase } from "./types";

/**
 * The translation backend (SPEC.md §8). Never imported by a client component —
 * `ANTHROPIC_API_KEY` stays server-side (SPEC.md §2 rule 6). Only
 * `src/app/api/translate/route.ts` may import this file; that boundary is
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

const client = new Anthropic(
  workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {},
);

// SPEC.md §3 pins this for the app's runtime translation calls. It is not a
// cost default: §3 draws the line deliberately between the product's
// per-request hot path and the coding agents that build this repo, which run
// on Opus and imply nothing about what the shipped app calls. Do not
// "upgrade" this because a coding session happens to run on a bigger model —
// raise EFFORT and measure first. No date suffix: IDs in this family carry
// none, and appending one yields a model that doesn't exist.
const MODEL = "claude-sonnet-5";

// Sampling parameters (temperature/top_p/top_k) are removed on current
// models and return a 400 — SPEC.md §8's original "temperature around 0.3"
// doesn't apply to the current API. Consistency instead comes from a tight
// prompt plus structured outputs, with a low effort level: this is a short,
// well-specified transformation, not a task that benefits from deep
// reasoning.
const EFFORT = "low";

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

const TranslationSchema = z.object({
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
});

function buildSystemPrompt(locale: string): string {
  return `You are an expert linguist specializing in ${localeName(locale)} as spoken in
everyday life. You are the translation backend for a travel phrasebook app.

Given input text, produce a contextual translation that reflects how a
native speaker actually talks — not textbook or Castilian phrasing.

Rules:
1. Detect whether the input is English or Spanish; translate to the other.
2. Give a "literal" translation (correct, neutral, safe in formal settings)
   and a "natural" translation (what a native speaker would really say).
3. Use neutral Latin American Spanish. No vosotros. Avoid strong regional
   slang unless the input itself is slang.
4. Pronunciation guides use Latin American sounds: seseo (c/z = s, never
   "th"), ll and y as a soft "y" sound. Write them so an English speaker
   reading aloud phonetically will be understood. If the input is Spanish and
   the output is English, write a plain phonetic guide for the English
   instead.
5. Fill culturalNote only when there is something a traveler would
   genuinely get wrong — a politeness convention, a false friend, a word
   that means something different here. Otherwise leave it as an empty
   string. Do not pad it.
6. category must be exactly one of: greetings, dining, transit, shopping,
   lodging, emergency, general. Use general when nothing else fits.

Examples:

Input: "Could I see the menu?"
Output: sourceLanguage "en", targetLanguage "es", literal "¿Podría ver el
menú?", natural "¿Me da el menú, por favor?", pronunciation "meh dah ehl
meh-NOO, por fah-VOR", category "dining", culturalNote "".

Input: "¿Dónde tomo el autobús?"
Output: sourceLanguage "es", targetLanguage "en", literal "Where do I catch
the bus?", natural "Where do I catch the bus?", pronunciation "WEHR doo eye
kach thuh buhs", category "transit", culturalNote "".

Input: "Estoy full"
Output: sourceLanguage "es", targetLanguage "en", literal "I am full",
natural "I'm stuffed", pronunciation "eem stuhft", category "dining",
culturalNote "Full here means physically full from eating, not the English
sense of complete — a common false friend for English speakers."`;
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
  };
}

export async function translate(text: string): Promise<Phrase> {
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
      system: buildSystemPrompt(locale),
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
