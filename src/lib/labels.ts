import type { Category } from "./categories";
import type { ShowCardKind, SpeakerGender } from "./types";

/**
 * Display labels for category slugs, keyed by language (SPEC.md §4).
 *
 * These are labels only. Nothing may be looked up by them — see
 * SPEC.md §2 rule 3 and the note in `categories.ts`.
 */
export const CATEGORY_LABELS: Record<"en" | "es", Record<Category, string>> = {
  en: {
    greetings: "Greetings",
    dining: "Food & Drink",
    transit: "Getting Around",
    shopping: "Shopping",
    lodging: "Where You Stay",
    emergency: "Emergencies",
    general: "General",
  },
  es: {
    greetings: "Saludos",
    dining: "Comida y Bebida",
    transit: "Transporte",
    shopping: "Compras",
    lodging: "Alojamiento",
    emergency: "Emergencias",
    general: "General",
  },
};

export function categoryLabel(category: Category, language: "en" | "es" = "en") {
  return CATEGORY_LABELS[language][category];
}

/** Labels for the speaker-gender setting (SPEC.md §12). Never key logic off these. */
export const SPEAKER_GENDER_LABELS: Record<"en", Record<SpeakerGender, string>> = {
  en: {
    neutral: "Neutral",
    feminine: "Feminine",
    masculine: "Masculine",
  },
};

/** Labels for show-card kinds (SPEC.md §12). Never key logic off these. */
export const SHOW_CARD_KIND_LABELS: Record<"en", Record<ShowCardKind, string>> = {
  en: {
    allergy: "Allergy",
    diet: "Diet",
    medical: "Medical",
    address: "Address",
    custom: "Custom",
  },
};

/**
 * Starter text for a new show card (SPEC.md §12), keyed by UI locale then kind.
 * A prompt to the user, not a template engine: they edit the whole sentence.
 * `address` and `custom` start empty — an address is entered verbatim.
 */
export const SHOW_CARD_STARTERS: Record<"en", Record<ShowCardKind, string>> = {
  en: {
    allergy:
      "I have a severe allergy to ___. Even a small amount can make me very sick. Please check with the kitchen.",
    diet: "I don't eat ___. Could you tell me which dishes don't contain it?",
    medical: "I have ___. I take ___. In an emergency, please call a doctor.",
    address: "",
    custom: "",
  },
};

/**
 * The fixed lead line on an address card (SPEC.md §12), keyed by *target*
 * locale. The address itself follows it untranslated.
 */
export const ADDRESS_LEAD: Record<string, string> = {
  "es-419": "Por favor, lléveme a:",
};
