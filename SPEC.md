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
3. **Category slugs are lowercase English and permanent.** Display labels are localized separately. `dining` is the slug forever; "Comida y Bebida" is a label in a translations file. This is the specific bug that broke the previous build — presets used Spanish keys while the API returned English ones.
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

Ported from the previous Firebase build. Do not migrate Firestore or Auth; they work fine from Vercel. Firebase project ID stays `sentido-cec08` — invisible to users, not worth changing.

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

- Cards: 32px radius (`rounded-3xl`)
- Inset images: 24px radius
- Buttons and pills: fully rounded
- Card press state: `scale(0.98)`, 100ms
- Card hover: `translateY(-2px)`, deeper shadow, border shifts to `--border-brand`

### The layout decision that matters

The editorial reference shows one large card per screen with a carousel. **Do not build that.** It's beautiful for browsing and terrible for someone standing at a counter who needs a phrase in four seconds.

Instead: **editorial header, dense body.** Each category page opens with a full-bleed banner image, an eyebrow label, a title, and a light airy lead paragraph — that's where the magazine feel lives. Below it, a plain scannable list of phrase cards. The look is editorial; the interaction is fast.

### Navigation

Header bar: hamburger left, wordmark centered, account avatar right. No floating bottom dock — the previous build had one, it's out.

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
6. Output strictly valid JSON matching the schema. No markdown fences,
   no commentary.
```

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

Set temperature around 0.3. Max output tokens ~1024 — the old config said 65,536, which was a copied default for a response that's a few hundred tokens.

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

**M2 — Live translation.** `/translate`, the Anthropic route handler, result card, all three states.

**M3 — Accounts and vault.** Firebase Auth, Firestore, local-first sync per section 7.

**M4 — Offline.** Service worker, manifest, iOS install, offline states.

Write ~40 preset phrases across the six visible categories before M1 — evenly spread, not 5 dining and 1 shopping like the old set.

---

## 11. Reference material

The old repo is a reference, not a template. Take from it: the color and type tokens, the general component shapes. Ignore: its category taxonomy (broken), its design section (written against mockups for a different Spain-based concept), its model config (stale), and its app name (invented — this project is not called Sentido).
