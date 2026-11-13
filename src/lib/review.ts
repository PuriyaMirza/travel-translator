import type { Phrase } from "./types";

/**
 * Draft text (SPEC.md §14). Spanish written for M8 ships before a fluent
 * speaker has read it. Where getting it wrong matters, the phrase carries a
 * visible "still a draft" marker until it has been reviewed.
 *
 * This file is the one place that decides what counts as high-stakes. It
 * must not import `phrases.ts`: client components use it, and that would pull
 * the whole phrase snapshot into the browser bundle. The list of draft preset
 * texts, for matching saved copies, is built server-side in `reviewPresets.ts`.
 */

type Placed = Pick<Phrase, "category" | "moment">;

/** Phrases where a wrong word could hurt someone: emergencies and what a traveller can't eat. */
export function isHighStakes(phrase: Placed): boolean {
  if (phrase.category === "emergency") return true;
  return phrase.category === "dining" && phrase.moment === "dietary";
}

/**
 * Whether to show the draft marker beside a preset phrase. Model translations
 * are never marked; they were never presented as reviewed.
 */
export function showsDraftNotice(phrase: Phrase): boolean {
  return phrase.draft === true && isHighStakes(phrase);
}

/** `locale|natural text`: how a saved copy is matched back to its preset. */
export function draftTextKey(phrase: Pick<Phrase, "locale" | "natural">): string {
  return `${phrase.locale}|${phrase.natural.trim()}`;
}
