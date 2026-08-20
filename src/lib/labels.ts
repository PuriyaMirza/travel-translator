import type { Category } from "./categories";

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
