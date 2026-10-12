import { brand } from "./brand";
import { isCategory } from "./categories";
import snapshot from "./phrases.snapshot.json";
import type { Phrase } from "./types";

/**
 * Preset phrases for the static phrasebook (SPEC.md §10, M1).
 *
 * The phrases live in Neon's `phrases` table (seeded from data/phrases/*.csv)
 * and reach the app through `phrases.snapshot.json`, bundled at build time so
 * the phrasebook works with zero signal (SPEC.md §7 "The phrase library").
 * Regenerate it with `node scripts/export-phrase-snapshot.mjs`.
 *
 * Only phrases with a pronunciation guide are shown: the app's phrase card
 * promises one, and the newer rows don't have them yet.
 *
 * House rules for the es-419 rows (data/phrases/es-419.csv):
 *
 * - No `vosotros`, anywhere, ever. Formal `usted` with strangers, which is
 *   what a traveller is almost always doing.
 * - Pronunciation uses Latin American sounds: seseo (c/z = "s", never "th"),
 *   `ll` and `y` as a soft "y". Stressed syllable in CAPS.
 * - `culturalNote` is filled only where a traveller would genuinely get it
 *   wrong. Most phrases do not have one, and that is correct — do not pad it.
 * - Minimal slang. Regional words are flagged in the note rather than used.
 */
export const PRESET_PHRASES: Phrase[] = snapshot.flatMap((row): Phrase[] => {
  if (row.locale !== brand.defaultLocale || !row.pronunciation) return [];
  if (!isCategory(row.category)) {
    throw new Error(`phrases.snapshot.json: "${row.id}" has unknown category "${row.category}"`);
  }
  return [{ ...row, category: row.category }];
});

export function phrasesForCategory(category: string): Phrase[] {
  return PRESET_PHRASES.filter((phrase) => phrase.category === category);
}
