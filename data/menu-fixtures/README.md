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

## Still needed

- **One photo that isn't a menu** (a street sign, a receipt with nothing personal on it, a landscape). It tests the `isMenu: false` → 422 path.

## Ground-truth questions these photos raise (settle in Phase 0, then update SPEC §14 and the prompt rules)

1. **Bilingual menus (02):** `original` is the first or primary language line, and the parallel translation line produces no row. *Suggested default.*
2. **Shared group prices (08, "All 660"):** a price printed explicitly for a group applies to every item in it. That isn't "inferring a price from a neighbour", so prompt rule 2 needs this exception spelled out.
3. **Add-ons and "from" prices (06, 03):** keep them in `prices[].label` ("+ dill herring" with amount "+5.00", "from" with amount "7,00"). The amount stays verbatim, plus sign included.
4. **No currency symbol (05, and 01's bare numbers):** leave `currency` as `""` unless a symbol or word is printed somewhere in the photo. Don't infer it from the language or country.
5. **These are cropped photos (500–2,500 px),** smaller than a phone camera's 12+ MP originals. They test reading accuracy, not the client resize path. That path is covered by the owner's real-iPhone test in Phase 4.
