/**
 * Human-readable names for the locales the translation prompt can target.
 *
 * Per SPEC.md §2 rule 2, locale is always a parameter — the prompt takes
 * `{{LOCALE_NAME}}` as a variable, never a literal region name baked into the
 * template. This is the one place that variable is resolved from a BCP 47 tag.
 */
const LOCALE_NAMES: Record<string, string> = {
  "es-419": "neutral Latin American Spanish",
};

export function localeName(locale: string): string {
  const name = LOCALE_NAMES[locale];
  if (!name) {
    throw new Error(`No locale name configured for "${locale}"`);
  }
  return name;
}
