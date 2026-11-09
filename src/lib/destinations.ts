/**
 * Countries a traveller can pick during onboarding, keyed by target locale.
 *
 * This is data, not logic (SPEC.md §2 rule 2): nothing branches on a country.
 * The code is stored; the English name is display only. A locale with no
 * entry simply offers no destination list.
 *
 * es-419 lists the Spanish-speaking countries of Latin America and the
 * Caribbean that neutral Latin American Spanish serves. Territories with
 * their own planned dialect pack are left out until that pack exists.
 */
export interface Destination {
  /** ISO 3166-1 alpha-2. Permanent, like category slugs. */
  code: string;
  /** English display name. Never key logic off it. */
  name: string;
}

const DESTINATIONS: Record<string, readonly Destination[]> = {
  "es-419": [
    { code: "MX", name: "Mexico" },
    { code: "CO", name: "Colombia" },
    { code: "PE", name: "Peru" },
    { code: "CR", name: "Costa Rica" },
    { code: "AR", name: "Argentina" },
    { code: "CL", name: "Chile" },
    { code: "EC", name: "Ecuador" },
    { code: "GT", name: "Guatemala" },
    { code: "DO", name: "Dominican Republic" },
    { code: "PA", name: "Panama" },
    { code: "BO", name: "Bolivia" },
    { code: "UY", name: "Uruguay" },
    { code: "PY", name: "Paraguay" },
    { code: "CU", name: "Cuba" },
    { code: "SV", name: "El Salvador" },
    { code: "HN", name: "Honduras" },
    { code: "NI", name: "Nicaragua" },
    { code: "VE", name: "Venezuela" },
  ],
};

export function destinationsFor(locale: string): readonly Destination[] {
  return DESTINATIONS[locale] ?? [];
}

/** The display name for a stored code, or undefined if the code is unknown. */
export function destinationName(locale: string, code: string): string | undefined {
  return destinationsFor(locale).find((d) => d.code === code)?.name;
}
