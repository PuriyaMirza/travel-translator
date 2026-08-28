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
| AI | Anthropic API, called from server route handlers only |
| Database | Cloud Firestore (offline persistence enabled) |
| Auth | Firebase Auth, email/password |
| Audio | Web Speech API (`window.speechSynthesis`) |
| Hosting | Vercel |
| Icons | `lucide-react` — no emoji as UI icons |

Firebase Auth and Firestore are new in this build, not a port — the previous app used Google Gemini for translation, not Anthropic, so there is no AI code to carry over. Provision a fresh Firebase project rather than reusing the previous one: that project is AI-Studio-managed on a non-default Firestore database, and its schema and security rules don't match this app's data model (section 7).

**Model:** use a current Claude model. Check the Anthropic docs for the model string rather than assuming one.

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
}
```

Security rules: a user reads and writes only their own subtree, default deny everything else.

### Local-first sync (the part the old build never specified)

- Logged out: phrases go to `localStorage`, `syncedFromLocal: false`
- On login: upload local phrases, dedupe on `sourceText + locale`, mark `syncedFromLocal: true`, then clear local
- Conflicts: last write wins, keyed on `savedAt`
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
```

Rule 6 does not need to police formatting. The response shape is enforced by the API through structured outputs (below), not by asking the model nicely — so no "output strictly valid JSON," no "no markdown fences," no "no commentary." Those instructions are cruft against a constrained decode and were removed.

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

Max output tokens ~1024 — this is a response that's a few hundred tokens, not a document; don't default to something enormous.

---

## 9. Offline and PWA

- Manifest: standalone, portrait, `#FAF8F5` background, `#B91C1C` theme, 192 and 512 icons
- Service worker: cache-first for the app shell, fonts, and category images
- Firestore handles offline data natively — don't hand-roll it
- `/api/translate` is network-only; offline shows the error state with an offline-specific message
- The phrasebook and vault must be fully usable with zero signal. That's the whole point of the product.
- iOS: `viewport-fit=cover` plus `env(safe-area-inset-top)` on the header, or it bleeds into the Dynamic Island

---

## 10. Build order

Ship each milestone to Vercel before starting the next.

**M0 — Pipeline.** Scaffold, `brand.ts`, tokens, header with wordmark. Deploy to Vercel. Nothing else. Prove the deploy works before there's anything complicated to blame.

**M1 — Static phrasebook.** Categories, preset phrases from a local file, editorial category pages, phrase cards, text-to-speech. No auth, no database, no AI. This is already a useful app.

**M2 — Live translation.** `/translate`, the Anthropic route handler, result card, all three states. No auth yet — the route is public, protected only by an input-length cap and a coarse per-IP throttle. Auth arrives in M3.

**M3 — Accounts and vault.** Firebase Auth, Firestore, local-first sync per section 7.

**M4 — Offline.** Service worker, manifest, iOS install, offline states.

Write ~40 preset phrases across the six visible categories before M1 — evenly spread, not 5 dining and 1 shopping like the old set.

---

## 11. Reference material

The old repo (`Puriya-translation-project-march-2026`) is a reference, not a template — and a limited one. It is a single-screen Vite SPA (one 472-line `App.tsx`, no routing, no phrasebook, no categories, no text-to-speech) built against Google Gemini, not Anthropic.

Take from it: the `cn()` class-name helper (`clsx` + `tailwind-merge`), the Tailwind `@theme` token pattern, two of its colour values (`#A3D9C9` and `#F4EBD0`, both already folded into section 5), the EB Garamond / Inter font pairing, and the general shape of its `firestore.rules` (default-deny, ownership helper functions) — not its actual rules, which target a different schema.

Ignore everything else: its translation service (Gemini, a different response shape, a hardcoded region in the prompt), its Firestore schema and Auth provider (Google popup, not email/password), its app name (invented — this project is not called Sentido), and its Firebase project (AI-Studio-managed — provision a fresh one instead; see section 3).
