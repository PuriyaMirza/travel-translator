# Menu scan fixtures (M7)

These are the owner's real menu photos, used for the M7 accuracy eval (`docs/proposals/menu-scan.md` §5). All metadata (EXIF, XMP, GPS) was stripped before commit. Every file is a JPEG well under 4 MB.

Each photo gets a sibling `<name>.expected.json` (a `MenuScan`, per the plan's §3.2) as ground truth. The orchestrator drafts these, and the owner verifies every price before the eval counts.

| File | Language | What it tests |
|---|---|---|
| `01-ja-renoir-coffee.jpg` | Japanese | Hot/Iced options; a description paragraph that isn't an item; photo captions with no price; items and sections cut off at the right edge ("Premium…", "Renoir e…"); glare on the American price; a tax-included footnote |
| `02-es-ca-para-empezar.jpg` | Spanish + Catalan | **Bilingual lines**: each Catalan line translates the Spanish line above it, so it isn't a separate item. Allergen icons with no text. Heavy glare over "Huevos rotos con jamón…" and "Super nachos" (partial). Comma decimals ("5,80€") |
| `03-es-tapas-chalkboard.jpg` | Spanish | Handwriting; inconsistent price formats ("2,2€", "12€", "10,80€"); a "from" price ("Tostadas desde … 7,00€"); "Croquetas 3u" (3 units) |
| `04-es-entrantes-racion.jpg` | Spanish | **Options taken from column headers** ("1/2 Ración" / "Ración"); "…" means that size isn't offered, so there's no row; the top line is cut off ("Paella de Marisco"); a "Calientes" heading with no items under it |
| `05-fr-bistro-plats.jpg` | French | **Two items per line**, which must be split; centred layout; prices with no currency symbol; whole-number prices ("3"); a sides section ("À côté"); cheese counts as options ("1 / 2 / 3 fromages") |
| `06-fr-levantine-plats.jpg` | French | Long ingredient descriptions; **add-ons** ("Suppléments: … +5.00€"); unpriced choices ("Au choix: Merguez / Féta"); dot decimals ("16.90€") |
| `07-it-primi.jpg` | Italian | Centred layout with prices on their own line ("16 Euro"); descriptions in parentheses; prep-time notes ("20 min"); a shadow across the page |
| `08-ja-tomboy-drinks.jpg` | Japanese | Dense, multi-column layout; glass/carafe options (グラス / カラフェ); a **shared group price** ("All 660" covers 8 beer cocktails); glare over the lassi prices; cut off at the bottom; mixed English and Japanese headings |
| `09-not-a-menu-settings.jpg` | English (UI) | **Not a menu → 422.** An iPhone Settings search list: a list of items with grey sub-lines that looks like a menu but has no prices or dishes. A hard negative |

## Ground-truth rules (owner decisions, 2026-10-29; mirrored in plan §3.4)

1. **Bilingual menus (02):** `original` is the first or primary language line. The parallel translation line creates no row.
2. **Shared group prices (08, "All 660"):** a price printed for a named group applies to every item in it.
3. **Options, add-ons and "from" prices (04, 06, 03):** these go in `prices[].label` with the amount verbatim, sign included. A "…" under a column-header option means it isn't offered, so no entry.
4. **Currency (all):** if a symbol or word is printed, use it (`currencySource: "printed"`). Otherwise estimate from the menu's language and the size of its prices (`"estimated"`), never from location. Expected values: 01 JPY (estimated), 02 EUR (printed), 03 EUR (printed), 04 EUR (printed), 05 EUR (estimated; owner confirmed France, 2026-10-29), 06 EUR (printed), 07 EUR (printed, "Euro"), 08 JPY (estimated), 09 n/a.
5. **These are cropped photos (500–2,500 px),** smaller than a phone camera's 12+ MP originals. They test reading accuracy, not the client resize path. That path is covered by the owner's real-iPhone test in Phase 4.

## Ground-truth status

| File | Expected JSON | Owner-verified prices |
|---|---|---|
| `01-ja-renoir-coffee.jpg` | drafted (Phase 0) | no |
| `02`–`08` | to draft in Phase 1 | no |
| `09-not-a-menu-settings.jpg` | to draft in Phase 1 (`isMenu: false`) | n/a |
