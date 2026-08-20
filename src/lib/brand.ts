/**
 * The single source of truth for the app's identity.
 *
 * Per SPEC.md §2 rule 1: the brand name lives in exactly one file. The
 * wordmark, <title>, PWA manifest, meta tags, and all copy read from here.
 * There must be zero string literals of the app name anywhere else.
 */
export const brand = {
  name: "Dialog",
  tagline: "What you'd actually say.",
  /** BCP 47 tag for neutral Latin American Spanish. */
  defaultLocale: "es-419",
} as const;

export type Brand = typeof brand;
