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

/*
 * M3 data model (SPEC.md §7). Timestamps are epoch milliseconds everywhere in
 * the client — in React state and in localStorage — and become Firestore
 * `Timestamp`s only at the storage boundary (`localFirst.ts`). One numeric
 * representation in app code means no `Timestamp | number` unions leaking
 * into components, and localStorage can hold the same shape Firestore does.
 */

/** Permanent slugs (SPEC.md §2 rule 3, §12). Labels arrive with M5. */
export const SPEAKER_GENDERS = ["neutral", "feminine", "masculine"] as const;
export type SpeakerGender = (typeof SPEAKER_GENDERS)[number];

/** Permanent slugs (SPEC.md §2 rule 3, §12). Nothing writes these until M5. */
export const SHOW_CARD_KINDS = ["allergy", "diet", "medical", "address", "custom"] as const;
export type ShowCardKind = (typeof SHOW_CARD_KINDS)[number];

// users/{uid}
export interface UserDoc {
  uid: string;
  email: string;
  createdAt: number;
  lastLoginAt: number;
  preferredLocale: string;
  speakerGender: SpeakerGender;
}

// users/{uid}/savedPhrases/{id}
export interface SavedPhrase {
  /** Derived from `sourceText + locale` — see `localFirst.ts` `docIdFor`. */
  id: string;
  locale: string;
  sourceText: string;
  literal: string;
  natural: string;
  culturalNote?: string;
  pronunciation: string;
  category: Category;
  /**
   * Not in SPEC.md §7's SavedPhrase — added so a saved es->en translation is
   * still read aloud in English. Same meaning and same absence rule as on
   * `Phrase`. See BUILDLOG.md (M3).
   */
  targetLanguage?: "en" | "es";
  savedAt: number;
  syncedFromLocal: boolean;
  /** Set when saved from a trip pack (SPEC.md §13). M6. */
  tripPackId?: string;
}

// users/{uid}/showCards/{id} — no writer until M5 (SPEC.md §12)
export interface ShowCard {
  id: string;
  locale: string;
  kind: ShowCardKind;
  title: string;
  sourceText: string;
  literal: string;
  natural: string;
  culturalNote?: string;
  pronunciation: string;
  createdAt: number;
  updatedAt: number;
  syncedFromLocal: boolean;
}

// users/{uid}/tripPacks/{id} — no writer until M6 (SPEC.md §13). Sign-in
// only, so never local-first and no syncedFromLocal.
export interface TripPack {
  id: string;
  locale: string;
  title: string;
  description: string;
  phraseCount: number;
  createdAt: number;
}
