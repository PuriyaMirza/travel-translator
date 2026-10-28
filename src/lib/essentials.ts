import { PRESET_PHRASES } from "./phrases";
import type { Phrase } from "./types";

/**
 * The phrases pinned to the top of the home screen.
 *
 * These are the "repair" phrases — the ones a traveller reaches for in the
 * middle of a conversation that is going wrong, when there is no time to pick
 * a category. They live in `general`, which has no home tile or route, so
 * without this list they would be unreachable.
 *
 * Ids, not text: ids are locale-independent, and the phrase itself comes from
 * PRESET_PHRASES, which already resolves `brand.defaultLocale`. Order is the
 * display order — most urgent first.
 */
export const ESSENTIAL_PHRASE_IDS = [
  "general-dont-understand",
  "general-slower",
  "general-repeat",
  "general-can-you-help",
  "general-bathroom",
  "general-lost",
  "general-map",
  "general-sorry",
] as const;

export const ESSENTIAL_PHRASES: Phrase[] = ESSENTIAL_PHRASE_IDS.map((id) => {
  const phrase = PRESET_PHRASES.find((candidate) => candidate.id === id);
  // Fail the build rather than silently pin fewer phrases. The usual cause is
  // a row with no pronunciation, which PRESET_PHRASES filters out.
  if (!phrase) {
    throw new Error(`essentials.ts: "${id}" is not a preset phrase (missing pronunciation?)`);
  }
  return phrase;
});
