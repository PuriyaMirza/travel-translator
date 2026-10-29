import { Crop } from "lucide-react";
import type { MenuPrice, MenuScan } from "@/lib/menuScanSchema";
import { cn } from "@/lib/utils";

/**
 * The menu-scan results table (SPEC.md §14, "Results UI" and "Accessibility").
 *
 * A real <table>: one row per price option, English as the row header, one
 * <tbody> per menu section with a rowgroup heading row. No `rowSpan` —
 * continuation rows leave Original/English visually blank and repeat the item
 * names as sr-only text so every row reads on its own.
 *
 * Amounts are strings copied from the menu. This file only adds a currency
 * symbol; it never parses, converts or rounds a number.
 */

const nameCache = new Map<string, string>();
const symbolCache = new Map<string, string>();
const pluralNameCache = new Map<string, string>();

/** "Japanese yen" for "JPY". Falls back to the code if Intl can't name it. */
export function currencyName(code: string): string {
  const cached = nameCache.get(code);
  if (cached !== undefined) return cached;
  let name = code;
  try {
    name = new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    // Malformed code from the model: show it as-is.
  }
  nameCache.set(code, name);
  return name;
}

/** "Japanese yen (JPY)", the picker's option text. */
export function currencyLabel(code: string): string {
  const name = currencyName(code);
  return name === code ? code : `${name} (${code})`;
}

function currencySymbol(code: string): string {
  const cached = symbolCache.get(code);
  if (cached !== undefined) return cached;
  let symbol = code;
  try {
    const parts = new Intl.NumberFormat("en", { style: "currency", currency: code }).formatToParts(0);
    symbol = parts.find((part) => part.type === "currency")?.value ?? code;
  } catch {
    // Malformed code: use it as the symbol.
  }
  symbolCache.set(code, symbol);
  return symbol;
}

/** Plural currency name for screen readers ("Japanese yen", "euros"). */
function spokenCurrency(code: string): string {
  const cached = pluralNameCache.get(code);
  if (cached !== undefined) return cached;
  let name = currencyName(code);
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "name",
    }).formatToParts(2);
    name = parts.find((part) => part.type === "currency")?.value ?? name;
  } catch {
    // Keep the fallback.
  }
  pluralNameCache.set(code, name);
  return name;
}

function Price({ price, currency }: { price: MenuPrice; currency: string }) {
  const { amount } = price;
  if (!currency) return <>{amount}</>;
  // A printed sign ("+5.00") stays in front of the symbol; the digits are untouched.
  const match = /^([+\-−–]\s*)?([\s\S]*)$/.exec(amount);
  const sign = match?.[1] ?? "";
  const rest = match?.[2] ?? amount;
  return (
    <>
      <span aria-hidden>{`${sign}${currencySymbol(currency)}${rest}`}</span>
      <span className="sr-only">{`${amount} ${spokenCurrency(currency)}`}</span>
    </>
  );
}

function Dash({ spoken }: { spoken: string }) {
  return (
    <>
      <span aria-hidden>&mdash;</span>
      <span className="sr-only">{spoken}</span>
    </>
  );
}

const headCell = "px-2 py-2 text-left text-xs font-semibold text-muted";
const cell = "px-2 py-2.5 align-top text-small break-words";

export function countItems(scan: MenuScan): number {
  return scan.sections.reduce((total, section) => total + section.items.length, 0);
}

export function MenuTable({ scan, currency }: { scan: MenuScan; currency: string }) {
  const sourceLang = scan.sourceLanguage || undefined;
  const hasOption = scan.sections.some((section) =>
    section.items.some((item) => item.prices.some((price) => price.label.trim() !== "")),
  );
  const columnCount = hasOption ? 4 : 3;
  const itemCount = countItems(scan);
  const caption = `${itemCount} ${itemCount === 1 ? "item" : "items"} from your menu. ${
    currency ? `Prices in ${currencyName(currency)}.` : "Prices as printed."
  }`;

  return (
    // Wrapping is the plan; at 200% text a long price can still overflow, and
    // then the table scrolls inside this box (WCAG 1.4.10 allows it for data
    // tables). A scrollable box must be reachable by keyboard, hence the
    // focusable labelled region.
    <div
      role="region"
      aria-label="Menu items"
      tabIndex={0}
      className="overflow-x-auto rounded-card border border-hairline bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <table className="w-full table-fixed border-collapse text-left text-ink">
        <caption className="px-3 py-2.5 text-left text-small text-muted">{caption}</caption>
        <colgroup>
          {hasOption ? (
            <>
              <col className="w-[28%]" />
              <col className="w-[34%]" />
              <col className="w-[16%]" />
              <col className="w-[22%]" />
            </>
          ) : (
            <>
              <col className="w-[36%]" />
              <col className="w-[44%]" />
              <col className="w-[20%]" />
            </>
          )}
        </colgroup>
        <thead>
          <tr className="border-y border-hairline">
            <th scope="col" className={headCell}>
              Original
            </th>
            <th scope="col" className={headCell}>
              English
            </th>
            {hasOption && (
              <th scope="col" className={headCell}>
                Option
              </th>
            )}
            <th scope="col" className={cn(headCell, "text-right")}>
              Price
            </th>
          </tr>
        </thead>
        {scan.sections.map((section, sectionIndex) => {
          if (section.items.length === 0) return null;
          const showHeading = section.original !== "" || section.english !== "";
          const sameName = section.original === section.english;
          return (
            <tbody key={sectionIndex}>
              {showHeading && (
                <tr className="border-b border-hairline/30 bg-canvas">
                  <th scope="rowgroup" colSpan={columnCount} className="px-2 py-2.5 text-left font-normal">
                    {section.english !== "" && (
                      <span lang="en" className="text-body-bold block break-words text-ink">
                        {section.english}
                      </span>
                    )}
                    {section.original !== "" && !(sameName && section.english !== "") && (
                      <span lang={sourceLang} className="block break-words text-small text-muted">
                        {section.original}
                      </span>
                    )}
                  </th>
                </tr>
              )}
              {section.items.flatMap((item, itemIndex) => {
                const partial = item.legibility === "partial";
                const rowPrices: (MenuPrice | null)[] =
                  item.prices.length > 0 ? item.prices : [null];
                return rowPrices.map((price, priceIndex) => {
                  const first = priceIndex === 0;
                  const last = priceIndex === rowPrices.length - 1;
                  return (
                    <tr
                      key={`${itemIndex}-${priceIndex}`}
                      className={cn(last && "border-b border-hairline/30")}
                    >
                      <td lang={sourceLang} className={cn(cell, "text-ink")}>
                        {first ? item.original : <span className="sr-only">{item.original}</span>}
                      </td>
                      <th scope="row" lang="en" className={cn(cell, "font-normal text-ink")}>
                        {first ? (
                          <>
                            <span className="block font-semibold">{item.english}</span>
                            {item.description !== "" && (
                              <span className="mt-0.5 block text-xs text-muted">
                                {item.description}
                              </span>
                            )}
                            {partial && (
                              <span className="mt-1 flex items-start gap-1 text-xs font-semibold text-muted">
                                <Crop aria-hidden className="mt-px size-3.5 shrink-0" />
                                <span>(partly cut off)</span>
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="sr-only">{item.english}</span>
                        )}
                      </th>
                      {hasOption && (
                        <td lang="en" className={cn(cell, "text-ink")}>
                          {price && price.label.trim() !== "" ? (
                            price.label
                          ) : (
                            <Dash spoken="No option" />
                          )}
                        </td>
                      )}
                      <td className={cn(cell, "pl-1 text-right tabular-nums")}>
                        {price ? (
                          <Price price={price} currency={currency} />
                        ) : partial ? (
                          <span lang="en" className="text-xs text-muted">
                            Price unclear from photo
                          </span>
                        ) : (
                          <Dash spoken="No price shown" />
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
