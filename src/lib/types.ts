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
  /**
   * Sub-group within the category (SPEC.md §14), a slug from `moments.ts`.
   * Only preset phrases have one.
   */
  moment?: string;
  /**
   * True while some of this phrase's authored text has not been read by a
   * fluent speaker (SPEC.md §14 "Draft text"). Absent means reviewed, or not
   * authored at all (a model translation).
   */
  draft?: boolean;
}

/**
 * Permanent slugs, same rule as category slugs (SPEC.md §2 rule 3): lowercase
 * English, never renamed. Display labels live in `labels.ts`.
 */
export const SPEAKER_GENDERS = ["neutral", "feminine", "masculine"] as const;
export type SpeakerGender = (typeof SPEAKER_GENDERS)[number];

/**
 * How much Spanish the traveller says they have, asked during onboarding.
 * Permanent slugs (SPEC.md §2 rule 3); labels live in `labels.ts`.
 */
export const SPANISH_COMFORT_LEVELS = ["none", "basic", "conversational"] as const;
export type SpanishComfort = (typeof SPANISH_COMFORT_LEVELS)[number];

export const SHOW_CARD_KINDS = ["allergy", "diet", "medical", "address", "custom"] as const;
export type ShowCardKind = (typeof SHOW_CARD_KINDS)[number];

/*
 * User data (SPEC.md §7). Timestamps are ISO strings: the same shape lives in
 * IndexedDB, crosses /api/sync as JSON, and maps to timestamptz columns.
 * `deletedAt` is a tombstone, so deletes sync like any other write.
 */

export interface UserSettings {
  preferredLocale: string;
  speakerGender: SpeakerGender;
  /*
   * Onboarding answers. Absent until answered. Synced to user_settings
   * (migration 002) by src/lib/sync/settings.ts.
   */
  /** ISO 3166-1 alpha-2 code from `destinations.ts`, e.g. "MX". */
  destination?: string;
  /** "YYYY-MM". */
  travelMonth?: string;
  spanishComfort?: SpanishComfort;
  updatedAt: string;
}

export interface SavedPhrase {
  /** Client-generated UUID, so a phrase saved offline keeps its id. */
  id: string;
  /** REQUIRED from the first write (SPEC.md §2 rule 4). */
  locale: string;
  sourceText: string;
  literal: string;
  natural: string;
  /** Empty string when there is nothing to say. */
  culturalNote: string;
  pronunciation: string;
  category: Category;
  /** Set when saved from a trip pack (M6); absent otherwise. */
  tripPackId?: string;
  savedAt: string;
  /** The client's clock. Decides conflicts: last write wins. */
  updatedAt: string;
  deletedAt?: string;
}

/** Written from M5 (SPEC.md §12). */
export interface ShowCard {
  id: string;
  locale: string;
  kind: ShowCardKind;
  title: string;
  sourceText: string;
  literal: string;
  natural: string;
  culturalNote: string;
  pronunciation: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Written from M6 (SPEC.md §13). */
export interface TripPack {
  id: string;
  locale: string;
  title: string;
  description: string;
  phraseCount: number;
  createdAt: string;
}
