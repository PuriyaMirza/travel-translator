import { ESSENTIAL_PHRASE_IDS } from "./essentials";
import { PRESET_PHRASES } from "./phrases";
import type { Phrase } from "./types";

/**
 * The phrase of the day (SPEC.md §6).
 *
 * Chosen deterministically from the preset list by UTC day number, so it needs
 * no AI, no network and no storage — it is identical on the server and in the
 * browser, which keeps the home page prerenderable and usable with no signal.
 * The AI-backed /api/daily-phrase route in SPEC.md §6 can replace this later
 * without changing the component.
 *
 * The pinned essentials are excluded: they are already on the home screen, so
 * picking one would show the same phrase twice. This also keeps the rotation
 * identical to what it was before the essentials gained pronunciations.
 */
const ESSENTIAL_IDS: ReadonlySet<string> = new Set(ESSENTIAL_PHRASE_IDS);
const DAILY_POOL = PRESET_PHRASES.filter((phrase) => !ESSENTIAL_IDS.has(phrase.id));

export function dailyPhrase(now: Date = new Date()): Phrase {
  const dayNumber = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000,
  );
  return DAILY_POOL[dayNumber % DAILY_POOL.length];
}
