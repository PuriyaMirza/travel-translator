/**
 * The canonical category enum (SPEC.md §4).
 *
 * Per SPEC.md §2 rule 3: these slugs are lowercase English and PERMANENT.
 * Display labels are localised separately in `labels.ts` — `dining` is the slug
 * forever, "Comida y Bebida" is only ever a label. Never key data, routes, or
 * API payloads off a translated string.
 */
export const CATEGORIES = [
  "greetings",
  "dining",
  "transit",
  "shopping",
  "lodging",
  "emergency",
  "general",
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * `general` is the fallback bucket — freeform translations won't always fit a
 * category, and the model needs somewhere valid to put them so the UI always
 * has a route. It deliberately has no tile on the home grid.
 */
export const HIDDEN_CATEGORIES: readonly Category[] = ["general"];

export const VISIBLE_CATEGORIES = CATEGORIES.filter(
  (category) => !HIDDEN_CATEGORIES.includes(category),
);

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
