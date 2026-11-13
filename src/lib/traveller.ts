import { destinationName } from "./destinations";
import {
  SPANISH_COMFORT_LEVELS,
  SPEAKER_GENDERS,
  type SpanishComfort,
  type SpeakerGender,
} from "./types";

/**
 * What the app knows about the traveller that changes the words they are
 * given (SPEC.md §12, §14): how they refer to themselves, where they are
 * going, when, and how much Spanish they have. The client sends this with
 * every model call; the server validates it here. No "use client" — both
 * sides import it.
 */
export interface Traveller {
  speakerGender: SpeakerGender;
  /** ISO 3166-1 alpha-2, from `destinations.ts`. */
  destination?: string;
  /** "YYYY-MM". Only the trip pack uses it. */
  travelMonth?: string;
  spanishComfort?: SpanishComfort;
}

export const DEFAULT_TRAVELLER: Traveller = { speakerGender: "neutral" };

/** The fields a request body carries for a traveller. Undefined ones are omitted by JSON. */
export function travellerRequestFields(traveller: Traveller) {
  return {
    speakerGender: traveller.speakerGender,
    destination: traveller.destination,
    travelMonth: traveller.travelMonth,
    spanishComfort: traveller.spanishComfort,
  };
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type ParsedTraveller =
  | { ok: true; traveller: Traveller }
  | { ok: false; message: string };

/**
 * Read a traveller from a request body.
 *
 * `speakerGender` keeps its M5 behaviour: absent means neutral, present but
 * not one of the three slugs is a client bug and is rejected. The onboarding
 * answers are optional hints, so an unknown value is dropped rather than
 * rejected (SPEC.md §14) — an older client, or a destination removed from the
 * list, must not break translation.
 */
export function parseTraveller(body: Record<string, unknown>, locale: string): ParsedTraveller {
  const speakerGender = body.speakerGender === undefined ? "neutral" : body.speakerGender;
  if (!SPEAKER_GENDERS.includes(speakerGender as SpeakerGender)) {
    return { ok: false, message: "Unknown speaker setting. Choose neutral, feminine or masculine." };
  }

  const traveller: Traveller = { speakerGender: speakerGender as SpeakerGender };

  // Validated against the list, so only a known country name can ever reach
  // the prompt — never text from the request.
  if (typeof body.destination === "string" && destinationName(locale, body.destination)) {
    traveller.destination = body.destination;
  }
  if (typeof body.travelMonth === "string" && MONTH.test(body.travelMonth)) {
    traveller.travelMonth = body.travelMonth;
  }
  if (SPANISH_COMFORT_LEVELS.includes(body.spanishComfort as SpanishComfort)) {
    traveller.spanishComfort = body.spanishComfort as SpanishComfort;
  }
  return { ok: true, traveller };
}

/** "March 2027" for a validated "YYYY-MM", in English: it is prompt text. */
export function travelMonthName(value: string): string | undefined {
  const match = MONTH.exec(value);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
