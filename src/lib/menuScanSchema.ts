import { z } from "zod/v4";

/**
 * The menu-scan contract (SPEC.md §14). Imported by the client (`MenuTable`,
 * `MenuScanner`) and the server (`menuScan.ts`, `api/menu-scan`), so it
 * imports zod only — never the SDK or anything server-side.
 *
 * Structured outputs require every field, so "nothing here" is `""` or `[]`,
 * never an omitted key.
 */

export const MenuPriceSchema = z.object({
  // The option as printed, in English: "Hot", "Iced", "S", "from",
  // "+ dill herring". "" when the menu prints no option label.
  label: z.string(),
  // Digits exactly as printed, e.g. "1,040" or "5,80". Never converted or
  // rounded: the client only adds a currency symbol (SPEC.md §14).
  amount: z
    .string()
    .describe("The price as printed: digits, separators and a leading + or - only. No currency symbol."),
});

export const MenuItemSchema = z.object({
  original: z.string().describe("The item's name only, verbatim as printed"),
  english: z.string(), // natural English name ("Vienna coffee", not "Wiener coffee")
  // English. "" unless the menu prints one or the dish needs a short gloss.
  description: z.string(),
  prices: z.array(MenuPriceSchema), // [] when no price is printed
  legibility: z.enum(["clear", "partial"]), // partial = cut off, glare or obscured
});

export const MenuSectionSchema = z.object({
  original: z.string(), // "" if the items have no heading
  english: z.string(),
  items: z.array(MenuItemSchema),
});

export const MenuScanSchema = z.object({
  isMenu: z.boolean(),
  sourceLanguage: z.string().describe('BCP 47 code of the menu\'s language, e.g. "ja"; never a name'),
  // ISO 4217 ("JPY"). "" only when there is no reasonable estimate.
  currency: z.string(),
  // printed = a symbol or word on the menu; estimated = from the menu's
  // language and price sizes. Never from the device's location.
  currencySource: z.enum(["printed", "estimated"]),
  sections: z.array(MenuSectionSchema),
  notes: z.array(z.object({ original: z.string(), english: z.string() })),
});

export type MenuPrice = z.infer<typeof MenuPriceSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type MenuSection = z.infer<typeof MenuSectionSchema>;
export type MenuScan = z.infer<typeof MenuScanSchema>;
