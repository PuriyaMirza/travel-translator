# Dialog — Project Spec (v1)

> Working name. Read `src/lib/brand.ts` for the current one; never hardcode it.

---

## 1. What this is

A travel phrasebook and contextual translator for English speakers traveling in Spanish-speaking countries. It is not a general-purpose translator. Google Translate already does word-for-word; this does *what you would actually say at the counter*, with pronunciation you can read aloud without knowing Spanish.

**v1 scope:** neutral Latin American Spanish (`es-419`). Minimal slang. Latin American pronunciation throughout — seseo (*gracias* = "grah-SEE-ahs," never "grah-THEE-ahs"), soft *y* for *ll*, no *vosotros* anywhere, ever.

**Planned but explicitly not v1:** country-specific dialect packs (Puerto Rico first), additional languages, camera/OCR menu translation.

**Audience:** English-speaking travelers, tourists, digital nomads, expats. Assume they know no Spanish, are on a phone, are often on bad or no signal, and are frequently standing in front of another human being who is waiting for them to finish.

---

## 2. Architecture rules (do not violate these)

These exist because v1 is one language and one region, and v2 is many. Every one of these is cheap now and expensive later.

1. **The brand name lives in exactly one file.** `src/lib/brand.ts` exports name, tagline, default locale. Wordmark, `<title>`, PWA manifest, meta tags, and all copy read from it. Zero string literals of the app name anywhere else.
2. **Locale is a parameter, never a hardcoded assumption.** No file contains the string "Puerto Rico" or region-specific logic in v1. The AI prompt takes locale and region as variables.
3. **Category slugs are lowercase English and permanent.** Display labels are localized separately. `dining` is the slug forever; "Comida y Bebida" is a label in a translations file. Keying data, routes, or API payloads off a translated string is the specific failure mode this rule exists to prevent.
4. **Every stored phrase carries a `locale` field.** From the very first write. Without it there is no way to tell `es-419` phrases from `es-PR` phrases later, and no clean migration.
5. **camelCase everywhere** — TypeScript, JSON API responses, Firestore fields. One convention, no mapping layer, no snake/camel bugs.
6. **No API keys client-side.** All model calls go through Next.js route handlers.

---

## 3. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+, App Router, TypeScript |
| Styling | Tailwind CSS, tokens as CSS custom properties |
| AI | Anthropic API (`claude-sonnet-5`), called from server route handlers only |
| Database | Cloud Firestore (offline persistence enabled) |
| Auth | Firebase Auth, email/password |
| Audio | Web Speech API (`window.speechSynthesis`) |
| Hosting | Vercel |
| Icons | `lucide-react` — no emoji as UI icons |

Firebase Auth and Firestore are new in this build, not a port — the previous app used Google Gemini for translation, not Anthropic, so there is no AI code to carry over. Provision a fresh Firebase project rather than reusing the previous one: that project is AI-Studio-managed on a non-default Firestore database, and its schema and security rules don't match this app's data model (section 7).

### Model

**The deployed app's runtime translation calls use `claude-sonnet-5`.** Use that exact string — model IDs in this family carry no date suffix, and appending one produces an ID that doesn't exist.

This is a deliberate choice, not a cost default, and the distinction it draws matters more than the model name:

- **Sonnet for the product's runtime.** Translation quality and cultural-note nuance is what `/api/translate` is judged on — a traveller reading *literal*, *natural*, and a pronunciation guide aloud at a counter. Sonnet 5 handles that well at a fraction of Opus's per-token cost, on a call the app makes on every user request.
- **Opus for the coding agents in this repo.** The subagents under `.claude/agents/` and the sessions that build this project are a separate concern with separate economics — a handful of long, hard reasoning tasks, not a per-request hot path. Nothing about which model writes the code implies anything about which model the shipped app calls.

Do not "upgrade" the runtime call to Opus because a coding session happens to run on it. If translation quality turns out to be the binding constraint, raise `output_config.effort` first (see section 8) and measure before changing the model — the two are different dials and effort is the cheaper one to turn.

Reconfirm the model string against the Anthropic docs before M2 code lands rather than trusting this line indefinitely; the pin is a decision, not a guarantee that the ID outlives the spec.

---

## 4. Categories

The canonical enum. Slugs are permanent:

```ts
export const CATEGORIES = [
  'greetings',
  'dining',
  'transit',
  'shopping',
  'lodging',
  'emergency',
  'general',
] as const;
```

`general` is the fallback bucket — freeform translations won't always fit a category, and the model needs somewhere valid to put them so the UI always has a route. It has no tile on the home grid.

Display labels live in `src/lib/labels.ts`, keyed by locale:

```ts
{ en: { dining: 'Food & Drink' }, es: { dining: 'Comida y Bebida' } }
```

---

## 5. Design system — "Voyage"

Editorial, not utilitarian. The reference feel is a well-made travel magazine: generous whitespace, big confident type, photography that carries the page. Warm and unhurried, not a settings screen.

### Colors

```css
:root {
  --bg-main:        #FAF8F5;  /* warm cream — page background */
  --bg-card:        #FFFFFF;
  --bg-card-subtle: #F4EBD0;  /* warm sand — pills, skeletons */
  --bg-dark:        #1C1917;  /* charcoal — overlays, banners */

  --brand:          #B91C1C;  /* deep crimson — the accent, used with restraint */
  --brand-hover:    #991B1B;
  --accent-gold:    #EAB308;
  --accent-sea:     #A3D9C9;

  --text-main:      #1C1917;
  --text-muted:     #8C7C6B;  /* warm sepia */
  --text-inverse:   #FFFFFF;

  --border-light:   #E7E5E4;
  --border-brand:   #FCA5A5;

  --shadow-soft: 0 10px 25px -5px rgba(0,0,0,0.04), 0 8px 10px -6px rgba(0,0,0,0.02);
}
```

Crimson is for the wordmark, primary actions, and the eyebrow labels. Nothing else. If a screen has more than two crimson elements, one of them is wrong.

### Typography

Two faces, deliberately contrasted:

- **Display** — a high-contrast serif or a wide geometric sans for the wordmark and page titles. The wordmark is set in caps with wide letter-spacing (~0.08em) and is the loudest thing on any screen.
- **Body/UI** — Inter for everything else.

| Token | Size | Weight | Line height | Notes |
|---|---|---|---|---|
| `display` | 32px | 700 | 1.15 | page titles |
| `h1` | 24px | 700 | 1.2 | |
| `h2` | 20px | 600 | 1.3 | |
| `lead` | 20px | 300 | 1.5 | the big airy intro paragraph on category pages — this is the editorial signature, keep it light-weight and roomy |
| `body` | 16px | 400 | 1.5 | |
| `body-bold` | 16px | 600 | 1.5 | |
| `small` | 14px | 400 | 1.4 | |
| `eyebrow` | 12px | 500 | 1.3 | uppercase, 0.1em tracking, crimson or muted — e.g. "PHRASEBOOK: TRANSIT" |

### Shape

- Cards: 32px radius — implemented as the `rounded-card` utility. (Tailwind v4's built-in `rounded-3xl` is 24px, not 32px — don't use it here.)
- Inset images: 24px radius — implemented as `rounded-image`.
- Buttons and pills: fully rounded
- Card press state: `scale(0.98)`, 100ms
- Card hover: `translateY(-2px)`, deeper shadow, border shifts to `--border-brand` (implemented as the `border-blush` utility — see the implementation note below)

### Implementation note: token naming

`:root` holds the tokens above under these exact names — that is the contract. Tailwind's `@theme inline` then maps them to shorter utility names, because these `--text-*` colour names collide with Tailwind v4's own `--text-*` font-size namespace:

```
bg-canvas, bg-card, bg-sand, bg-charcoal
text-brand, text-ink, text-muted, text-inverse
border-hairline, border-blush
```

`--border-brand` maps to `border-blush` specifically, not `border-brand` — a literal `border-brand` utility would resolve to crimson (`#B91C1C`), not this token's pale pink (`#FCA5A5`).

### The layout decision that matters

The editorial reference shows one large card per screen with a carousel. **Do not build that.** It's beautiful for browsing and terrible for someone standing at a counter who needs a phrase in four seconds.

Instead: **editorial header, dense body.** Each category page opens with a full-bleed banner image, an eyebrow label, a title, and a light airy lead paragraph — that's where the magazine feel lives. Below it, a plain scannable list of phrase cards. The look is editorial; the interaction is fast.

### Navigation

Header bar: hamburger left, wordmark centered, account avatar right. No floating bottom dock.

---

## 6. Screens

| Route | Purpose |
|---|---|
| `/` | Home. Wordmark, Daily Phrase card, 2-column category grid, freeform translate entry point. |
| `/phrasebook/[category]` | Editorial banner + phrase list for one category. |
| `/translate` | Freeform input, result card with literal + natural + cultural note + pronunciation. |
| `/vault` | Saved phrases. Filter by category. |
| `/api/translate` | POST. Server route → Anthropic. |
| `/api/daily-phrase` | GET. Cached per day. |
| `/cards` | Show cards: list, create, edit. M5 — see section 12. |
| `/cards/[id]` | Full-screen show mode for one card. M5. |
| `/trip` | Trip prep: describe the trip, preview generated phrases, save them to the vault. M6 — see section 13. |
| `/api/trip-pack` | POST. Server route → Anthropic. Generates a batch of phrases for one trip. M6. |

Every list screen needs three states beyond default: loading (skeleton cards, `--bg-card-subtle` blocks, `animate-pulse`), empty (dashed border, a clear invitation to act, never an apology), and error (crimson-tinted card, plain statement of what failed, retry button). Error copy names the problem and the fix — it does not apologize and does not mention the AI provider by name.

---

## 7. Data model

```ts
// users/{uid}
interface UserDoc {
  uid: string;
  email: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  preferredLocale: string;   // 'es-419'
}

// users/{uid}/savedPhrases/{id}
interface SavedPhrase {
  id: string;
  locale: string;            // REQUIRED. 'es-419' in v1.
  sourceText: string;        // English
  literal: string;
  natural: string;           // how a native speaker would actually say it
  culturalNote?: string;
  pronunciation: string;
  category: Category;
  savedAt: Timestamp;
  syncedFromLocal: boolean;
  tripPackId?: string;       // set when saved from a trip pack (section 13); absent otherwise
}

// users/{uid}/showCards/{id}    — written from M5 (section 12)
interface ShowCard {
  id: string;
  locale: string;            // REQUIRED, same rule as SavedPhrase
  kind: ShowCardKind;        // 'allergy' | 'diet' | 'medical' | 'address' | 'custom'
  title: string;             // the user's own English label, e.g. "Peanut allergy"
  sourceText: string;        // English the user wrote; for 'address', the address verbatim
  literal: string;           // the Spanish shown in show mode (see section 12)
  natural: string;
  culturalNote?: string;
  pronunciation: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  syncedFromLocal: boolean;
}

// users/{uid}/tripPacks/{id}    — written from M6 (section 13)
interface TripPack {
  id: string;
  locale: string;            // REQUIRED
  title: string;             // user-entered, ≤ 60 chars, e.g. "Mexico City, 2 weeks"
  description: string;       // the trip description sent to the model
  phraseCount: number;
  createdAt: Timestamp;
  syncedFromLocal: boolean;
}
```

`ShowCardKind` slugs follow the same rule as category slugs (section 2, rule 3): lowercase English, permanent, display labels in `src/lib/labels.ts`.

**M3 ships all three shapes.** `showCards` and `tripPacks` have no writer until M5 and M6, but their types and security rules land in M3 so neither milestone has to reopen the schema or the rules.

Security rules: a user reads and writes only their own subtree, default deny everything else. Write the ownership rule as a recursive match on `users/{uid}/{document=**}`, not one block per collection, so collections added later are covered without a rules change.

### Local-first sync (the part the old build never specified)

- Logged out: phrases go to `localStorage`, `syncedFromLocal: false`
- On login: upload local phrases, dedupe on `sourceText + locale`, mark `syncedFromLocal: true`, then clear local
- Conflicts: last write wins, keyed on `savedAt`
- Build the sync as one helper parameterised by collection, dedupe key, and timestamp field — not code specific to saved phrases. M3 uses it for `savedPhrases`. M5 reuses it for `showCards` (dedupe on `kind + sourceText + locale`, last write wins on `updatedAt`). M6 reuses it for `tripPacks` (dedupe on `id`).
- Use the current Firestore persistence API (`persistentLocalCache` via `initializeFirestore`) — `enableIndexedDbPersistence` is deprecated

---

## 8. The translation prompt

Template with variables. Do not hardcode a region into it.

```
You are an expert linguist specializing in {{LOCALE_NAME}} as spoken in
everyday life. You are the translation backend for a travel phrasebook app.

Given input text, produce a contextual translation that reflects how a
native speaker actually talks — not textbook or Castilian phrasing.

Rules:
1. Detect whether the input is English or Spanish; translate to the other.
2. Give a "literal" translation (correct, neutral, safe in formal settings)
   and a "natural" translation (what a native speaker would really say).
3. Use neutral Latin American Spanish. No vosotros. Avoid strong regional
   slang unless the input itself is slang.
4. Pronunciation guides use Latin American sounds: seseo (c/z = s, never
   "th"), ll and y as a soft "y" sound. Write them so an English speaker
   reading aloud phonetically will be understood.
5. Fill culturalNote only when there is something a traveler would
   genuinely get wrong — a politeness convention, a false friend, a word
   that means something different here. Otherwise leave it empty.
   Do not pad it.
6. Fill every field of the schema. Leave culturalNote as an empty
   string rather than omitting it.
7. category must be exactly one of the seven canonical slugs (section 4).
   Use general when nothing else fits.
```

Rule 6 does not need to police formatting. The response shape is enforced by the API through structured outputs (below), not by asking the model nicely — so no "output strictly valid JSON," no "no markdown fences," no "no commentary." Those instructions are cruft against a constrained decode and were removed.

Rule 7 earns its place even though the schema also carries the field: `category` is deliberately typed as a plain string rather than an enum (see the route handler note below), so the prompt is the only place the seven slugs are stated to the model. The runtime `isCategory()` check is the backstop, not the primary instruction.

Response shape (camelCase, matching `SavedPhrase`):

```json
{
  "sourceText": "string",
  "sourceLanguage": "en | es",
  "targetLanguage": "en | es",
  "literal": "string",
  "natural": "string",
  "culturalNote": "string",
  "pronunciation": "string",
  "category": "greetings|dining|transit|shopping|lodging|emergency|general"
}
```

Include two or three few-shot examples in the prompt. Use neutral Latin American ones — *¿Me da el menú?*, *¿Dónde tomo el autobús?* — not the Puerto Rican *guagua*/*bregando* examples from the old build.

### Request parameters

Declare the response shape as a JSON schema and pass it as `output_config.format`, so the eight fields above — `literal`, `natural`, `culturalNote`, `pronunciation`, and the rest — are structurally guaranteed rather than parsed hopefully out of prose. Mark every field required, `culturalNote` included; an empty string is the "nothing to say" value, not an absent key. The route handler still validates `category` against the `CATEGORIES` tuple before trusting it.

Set `output_config.effort` to `"low"`. This is a short, tightly-specified transformation with the output shape already pinned by the schema — it does not need deep reasoning, and the default (`high`) would spend tokens and latency on a task that resolves in one step. Effort is the cost/depth dial, and `low` is the bottom of the five-step range (`low`, `medium`, `high`, `xhigh`, `max`).

**Do not pass `temperature`, `top_p`, or `top_k`.** Current Claude models reject sampling parameters outright — the request fails with a 400, it does not degrade gracefully. An earlier version of this spec said "temperature around 0.3"; that instruction is void and predates the current API.

Note what did and did not replace it. Structured outputs guarantees the *shape* of the response. `effort` controls *how much thinking* the model spends getting there. Neither one is a determinism knob, and the API no longer exposes one — so do not read `effort: "low"` as "the old temperature setting, renamed." Two identical requests may still return differently-worded translations. If the product ever needs a stable answer for a given input, that comes from caching the result, not from a request parameter.

Set `max_tokens` to **4096**.

The response itself is a few hundred tokens, so 4096 looks generous — it isn't, and the reason is worth stating. On current models adaptive thinking is on unless explicitly disabled, and **thinking tokens count against `max_tokens`**. The cap is not a budget for the visible answer; it is a budget for thinking plus answer. An earlier version of this spec said ~1024, sized as if the JSON were the only thing being generated. At `effort: "low"` thinking is short, but 1024 leaves no margin, and the failure is ugly: the response truncates mid-generation and the structured output arrives incomplete.

4096 is headroom, not a target — normal responses will use a fraction of it, and unused capacity costs nothing, since output is billed on tokens actually generated. This also stays well clear of the threshold where the SDKs want streaming to dodge HTTP timeouts, so `/api/translate` can stay a plain non-streaming request.

---

## 9. Offline and PWA

- Manifest: standalone, portrait, `#FAF8F5` background, `#B91C1C` theme, 192 and 512 icons
- Service worker: cache-first for the app shell, fonts, and category images
- Cache the shell for every app route by pattern, not from a hand-maintained route list. Routes added after M4 (`/cards`, `/cards/[id]`, `/trip`) must work offline without editing the service worker.
- Firestore handles offline data natively — don't hand-roll it
- `/api/translate` and `/api/trip-pack` are network-only; offline shows the error state with an offline-specific message. Exception from M6: `/translate` first checks the recent-translations cache (section 13).
- `/cards` and `/cards/[id]` render entirely from local data (Firestore's offline cache, or `localStorage` when logged out). No server fetch on that path. A show card that needs signal to open is useless.
- The phrasebook and vault must be fully usable with zero signal. That's the whole point of the product.
- iOS: `viewport-fit=cover` plus `env(safe-area-inset-top)` on the header, or it bleeds into the Dynamic Island

---

## 10. Build order

Ship each milestone to Vercel before starting the next.

**M0 — Pipeline.** Scaffold, `brand.ts`, tokens, header with wordmark. Deploy to Vercel. Nothing else. Prove the deploy works before there's anything complicated to blame.

**M1 — Static phrasebook.** Categories, preset phrases from a local file, editorial category pages, phrase cards, text-to-speech. No auth, no database, no AI. This is already a useful app.

**M2 — Live translation.** `/translate`, the Anthropic route handler, result card, all three states. No auth yet — the route is public, protected only by an input-length cap and a coarse per-IP throttle. Auth arrives in M3.

**M3 — Accounts and vault.** Firebase Auth, Firestore, local-first sync per section 7. Includes the `ShowCard` and `TripPack` types, the optional `tripPackId` on `SavedPhrase`, the recursive ownership rule, and the collection-generic sync helper, even though nothing writes the new collections yet.

**M4 — Offline.** Service worker, manifest, iOS install, offline states. Shell caching is route-pattern based per section 9.

**M5 — Show cards.** `/cards`, `/cards/[id]`, show mode, the five kinds, all three list states. Reuses `/api/translate` unchanged. See section 12.

**M6 — Trip pack.** `/trip`, `/api/trip-pack`, save-to-vault with `tripPackId`, vault filter by trip, and the recent-translations cache on `/translate`. See section 13.

Write ~40 preset phrases across the six visible categories before M1 — evenly spread, not 5 dining and 1 shopping like the old set.

---

## 11. Reference material

The old repo (`Puriya-translation-project-march-2026`) is a reference, not a template — and a limited one. It is a single-screen Vite SPA (one 472-line `App.tsx`, no routing, no phrasebook, no categories, no text-to-speech) built against Google Gemini, not Anthropic.

Take from it: the `cn()` class-name helper (`clsx` + `tailwind-merge`), the Tailwind `@theme` token pattern, two of its colour values (`#A3D9C9` and `#F4EBD0`, both already folded into section 5), the EB Garamond / Inter font pairing, and the general shape of its `firestore.rules` (default-deny, ownership helper functions) — not its actual rules, which target a different schema.

Ignore everything else: its translation service (Gemini, a different response shape, a hardcoded region in the prompt), its Firestore schema and Auth provider (Google popup, not email/password), its app name (invented — this project is not called Sentido), and its Firebase project (AI-Studio-managed — provision a fresh one instead; see section 3).

---

## 12. Show cards (M5)

A show card is a phrase you hand over, not one you say. The user turns the phone around and the waiter, pharmacist, or taxi driver reads it. It exists for moments where getting it wrong matters (a food allergy, a medication, where you're staying) and where the user can't fall back on pointing and gesturing.

### Kinds

| Slug | Starter text (English, editable) |
|---|---|
| `allergy` | "I have a severe allergy to ___. Even a small amount can make me very sick. Please check with the kitchen." |
| `diet` | "I don't eat ___. Could you tell me which dishes don't contain it?" |
| `medical` | "I have ___. I take ___. In an emergency, please call a doctor." |
| `address` | No sentence: the user enters the address verbatim. |
| `custom` | Blank. |

Starter text lives in a local file keyed by kind slug and UI locale, like labels. It is a prompt to the user, not a template engine: the user edits the whole sentence freely.

### Creating a card

- `allergy`, `diet`, `medical`, `custom`: the user edits the English and the client POSTs it to `/api/translate`, unchanged from M2. The result is stored on the card, so creating a card needs signal but showing it never does.
- `address`: **no model call.** The card shows a fixed localized lead line ("Por favor, lléveme a:") from `src/lib/labels.ts`, followed by the address exactly as typed. Street names and building names must not be translated, and the model has no reason to touch them.
- Editing the English text re-translates the card and needs signal. Offline, the text field is disabled with a plain statement why. Renaming and deleting work offline.

### Show mode (`/cards/[id]`)

- Full screen, `--bg-dark` background, `--text-inverse` text. The header is hidden. A close control sits top-left, inside `env(safe-area-inset-top)`.
- The Spanish is set in the `display` token (32px/700) at minimum. It shows the card's **`literal`** field, not `natural`: section 8 defines `literal` as "correct, neutral, safe in formal settings", which is the register you want in front of a pharmacist.
- The user's English `sourceText` sits underneath in `small` and `--text-muted`, so a bilingual reader can check it and the user knows exactly what they're showing.
- Speak button (existing `useSpeech`) for reading it aloud.
- The Screen Wake Lock API keeps the screen on while show mode is open. This is progressive: where the API is missing, nothing breaks and nothing is shown.
- No crimson in show mode. It's a high-contrast reading surface, not a branded one.

### List (`/cards`)

The three list states from section 6 apply. The empty state invites the user to make their first card and offers the five kinds as tiles with a lucide icon for each.

---

## 13. Trip pack (M6)

Before leaving, the user describes their trip in plain English ("vegetarian, two weeks in Mexico City and Oaxaca, staying in hostels, overnight buses") and gets 20 phrases specific to it, ready to save to the vault for offline use. The preset phrasebook covers what every traveler needs. The trip pack covers what *this* traveler needs.

### Flow (`/trip`)

1. The user enters a title (≤ 60 chars) and a description (≤ 500 chars, the same cap as `/api/translate`).
2. Generate → loading state: skeleton phrase cards plus a line saying this takes a little while. It's one request, not a stream.
3. Preview: generated phrases render as standard phrase cards, each with a checkbox, all checked by default.
4. "Save N to vault" writes a `TripPack` plus one `SavedPhrase` per checked phrase, each with `tripPackId` set. Logged out, both go to `localStorage` and sync on login per section 7.
5. The vault gains a trip filter alongside the category filter.

### `/api/trip-pack`

- POST `{ title, description, locale }` → `{ phrases: Phrase[] }`.
- Model, effort, and sampling rules are identical to section 8: `claude-sonnet-5`, `output_config.effort: "low"`, no sampling parameters, structured outputs via `output_config.format`. The schema is an object with one `phrases` array whose items are the section 8 response shape.
- `max_tokens`: **16000.** Twenty phrases at roughly 150 tokens each is about 3,000 tokens of answer, and thinking counts against the cap (section 8). 16000 gives the same kind of headroom 4096 gives a single phrase while staying a plain non-streaming request. If measured latency makes the loading state painful, switch to streaming before reducing the phrase count.
- Validate every phrase's `category` with `isCategory()`, falling back to `general` exactly as `/api/translate` does. Accept up to 25 phrases and truncate beyond that. Fewer than 10 is an error state, not a short pack.
- Throttle: a separate, tighter bucket in `rateLimit.ts`. A trip pack costs roughly twenty translations, so 3 per IP per hour, not 10 per minute.
- Network-only; offline shows the error state with an offline-specific message.

### Trip-pack prompt

A separate template from section 8, with the same variables (`{{LOCALE_NAME}}`, never a hardcoded region). It reuses section 8's rules 2, 3, 4, 5 and 7 verbatim, so they live in one shared constant in code, not two copies that drift. It adds:

- Generate phrases the traveler will **say** or **show**: English source, Spanish target. Every phrase has `sourceLanguage: "en"`.
- Be specific to the described trip, not a generic phrasebook. A vegetarian gets "Does this have meat broth in it?", not "Where is the bathroom?"
- Don't repeat the presets: the request includes the preset `sourceText` list.
- Spread across categories only as far as the trip warrants. Don't pad a category to balance the set.

### Recent translations cache

Part of M6 because it's the other half of "translations you made before you lost signal."

- Every successful `/api/translate` result is stored on the device in `localStorage`: the 50 most recent, keyed on normalized `sourceText + locale` (trimmed, lowercased). Device-local, never synced. It is a cache, not the vault.
- `/translate` shows these as a "Recent" list under the input.
- Offline, submitting text that exactly matches a cached key shows the cached result, labelled as saved on this device, not the offline error. Anything else gets the offline error as before.
- This is also where section 8's "a stable answer for a given input comes from caching the result" lands.
