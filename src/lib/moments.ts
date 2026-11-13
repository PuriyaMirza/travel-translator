import type { Category } from "./categories";

/**
 * Moments: the sub-groups within a category (SPEC.md §14) — "Ordering",
 * "Paying". Lowercase English slugs, permanent, in display order. Labels are
 * in `labels.ts`.
 *
 * Never call these "situations" in code: the phrase CSV's category column is
 * already named `situation`, and Home labels the category grid "Situations".
 *
 * A slug is unique within its category, not globally (`paying` is in dining
 * and shopping), so anything that stores one keys on category + moment.
 */
export const MOMENTS = {
  greetings: ["hellos", "courtesy", "language"],
  dining: ["arriving", "ordering", "dietary", "paying"],
  transit: ["finding", "tickets", "routes", "taxi"],
  shopping: ["browsing", "prices", "paying", "cash"],
  lodging: ["check-in", "room-problems", "check-out"],
  emergency: ["getting-help", "medical", "loss"],
  general: [],
} as const satisfies Record<Category, readonly string[]>;

export function momentsFor(category: Category): readonly string[] {
  return MOMENTS[category];
}

export function isMoment(category: Category, value: unknown): value is string {
  return typeof value === "string" && momentsFor(category).includes(value);
}
