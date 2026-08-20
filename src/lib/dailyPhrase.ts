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
 */
export function dailyPhrase(now: Date = new Date()): Phrase {
  const dayNumber = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000,
  );
  return PRESET_PHRASES[dayNumber % PRESET_PHRASES.length];
}
