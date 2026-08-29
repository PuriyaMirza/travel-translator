import type { Category } from "./categories";

/**
 * A phrase, whether preset or translated.
 *
 * `locale` is required on every phrase from the very first write (SPEC.md §2
 * rule 4). Without it there is no way to tell es-419 phrases from es-PR
 * phrases when the dialect packs land, and no clean migration.
 */
export interface Phrase {
  id: string;
  locale: string;
  /** English. */
  sourceText: string;
  /** Correct, neutral, safe in formal settings. */
  literal: string;
  /** How a native speaker would actually say it. */
  natural: string;
  /** Only when a traveller would genuinely get something wrong. */
  culturalNote?: string;
  /** Written so an English speaker reading aloud will be understood. */
  pronunciation: string;
  category: Category;
  /**
   * The language `natural`/`literal` are written in. Absent on all 42 preset
   * phrases (always Spanish); present on translation results, which are
   * bidirectional — an es->en result is English, not Spanish.
   */
  targetLanguage?: "en" | "es";
}
