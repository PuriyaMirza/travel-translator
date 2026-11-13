import { brand } from "./brand";
import { isCategory } from "./categories";
import { isMoment } from "./moments";
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
 * Every es-419 row has a pronunciation guide since M8, so all 100 show: 92
 * across the six visible categories, grouped by moment (`moments.ts`), plus
 * the 8 `general` essentials pinned on the home screen (`essentials.ts`). A
 * row without a guide is still skipped, because the phrase card promises one;
 * that is what keeps the fr-FR and de-DE rows out until they are written.
 *
 * Rows marked `review: "draft"` have text no fluent speaker has read yet.
 * `review.ts` decides which of those carry a visible marker.
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
  // A phrase in a visible category must sit in one of that category's
  // moments, or it would fall off the grouped page. Fail the build instead.
  const moment = "moment" in row ? row.moment : undefined;
  if (row.category !== "general" && !isMoment(row.category, moment)) {
    throw new Error(`phrases.snapshot.json: "${row.id}" has unknown moment "${moment}" for ${row.category}`);
  }
  const { review, ...phrase } = { review: undefined, ...row };
  return [{ ...phrase, category: row.category, moment, ...(review === "draft" ? { draft: true } : {}) }];
});

export function phrasesForCategory(category: string): Phrase[] {
  return PRESET_PHRASES.filter((phrase) => phrase.category === category);
}
