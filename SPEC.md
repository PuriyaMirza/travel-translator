# Dialog — Project Spec (v1)

> Working name. Read `src/lib/brand.ts` for the current one; never hardcode it.

---

## 1. What this is

A travel companion for someone who doesn't speak the local language. Pulled out in a specific situation, it gives exactly the words needed to get through it. Every feature is judged by one question: *does this hand someone the exact words for the moment they're in?*

**What it is not:**

- **Not a language-learning app.** No lessons, streaks, drills or progress tracking. The user is not trying to learn the language; they are trying to get through the next two minutes.
- **Not a stock phrasebook.** A fixed list of phrases is a starting point, not the product. The words should fit the situation and the traveller.
- **Not a general-purpose translator.** Google Translate already does word-for-word; this does *what you would actually say at the counter*, with pronunciation you can read aloud without knowing the language.

**v1 scope:** English speakers traveling in Spanish-speaking countries; neutral Latin American Spanish (`es-419`). Minimal slang. Latin American pronunciation throughout — seseo (*gracias* = "grah-SEE-ahs," never "grah-THEE-ahs"), soft *y* for *ll*, no *vosotros* anywhere, ever.

**Planned but explicitly not v1:** country-specific dialect packs (Puerto Rico first), additional languages, camera/OCR menu translation.

**Audience:** English-speaking travelers, tourists, digital nomads, expats. Assume they know no Spanish, are on a phone, are often on bad or no signal, and are frequently standing in front of another human being who is waiting for them to finish.

---

## 2. Architecture rules (do not violate these)

These exist because v1 is one language and one region, and v2 is many. Every one of these is cheap now and expensive later.

1. **The brand name lives in exactly one file.** `src/lib/brand.ts` exports name, tagline, default locale. Wordmark, `<title>`, PWA manifest, meta tags, and all copy read from it. Zero string literals of the app name anywhere else.
2. **Locale is a parameter, never a hardcoded assumption.** No file contains the string "Puerto Rico" or region-specific logic in v1. The AI prompt takes locale and region as variables.
3. **Category slugs are lowercase English and permanent.** Display labels are localized separately. `dining` is the slug forever; "Comida y Bebida" is a label in a translations file. Keying data, routes, or API payloads off a translated string is the specific failure mode this rule exists to prevent.
4. **Every stored phrase carries a `locale` field.** From the very first write. Without it there is no way to tell `es-419` phrases from `es-PR` phrases later, and no clean migration.
5. **camelCase everywhere above the database** — TypeScript and JSON API responses. Postgres columns are snake_case (unquoted identifiers fold to lowercase). The one mapping point is the SQL itself: every query aliases its columns (`source_text AS "sourceText"`), so nothing above the query layer ever sees snake_case.
6. **No API keys client-side.** All model calls go through Next.js route handlers.

---

## 3. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+, App Router, TypeScript |
| Styling | Tailwind CSS, tokens as CSS custom properties |
| AI | Anthropic API (`claude-sonnet-5`), called from server route handlers only |
| Database | Neon Postgres. Driver: `@neondatabase/serverless`. Plain SQL migrations in `db/migrations/`; no ORM. |
| Auth | Neon Auth, email/password. Sessions verified server-side in route handlers via one `requireUser()` helper. |
| Offline store | IndexedDB on the device, through `idb`. See section 7, "Local-first sync". |
| Audio | Web Speech API (`window.speechSynthesis`) |
| Hosting | Vercel |
| Icons | `lucide-react` — no emoji as UI icons |

The database and auth are new in this build, not a port — the previous app used Google Gemini and Firebase, and none of its data layer carries over. The Neon project for this app is created by the owner in the Neon console; its connection string reaches the app as `DATABASE_URL` (set in Vercel project settings, never committed). Neon Auth package and env var names are confirmed against Neon's docs before M3 code lands.

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

"Stamp blues" (adopted Oct 2026 from Figma: Playground Env › Language App › "Stamp blues palette · A Light editorial"). Ink-outlined, flat, no drop shadows. Figma variable names in brackets.

```css
:root {
  --bg-main:        #F2F1EA;  /* stone — page background [surface-4] */
  --bg-card:        #FFFFFF;
  --bg-card-subtle: #A6DCD9;  /* mint — feature cards, hovers, skeletons [surface-3] */
  --bg-dark:        #1A1856;  /* navy — overlays, show mode [surface-1] */

  --brand:          #33308A;  /* indigo — eyebrows, primary actions [surface-2] */
  --brand-hover:    #1A1856;
  --accent-sea:     #A6DCD9;
  --accent-rule:    #16151C;  /* the short rule before eyebrows [accent-2] */

  --text-main:      #1A1856;
  --text-muted:     #33308A;  /* the design has no grey */
  --text-inverse:   #F2F1EA;

  --border-light:   #1A1856;  /* outlines are solid ink */
  --border-brand:   #33308A;

  --shadow-soft: none;
}
```

Mint is for one feature surface per screen (the daily phrase, a translation result). Indigo fills are for the primary action only.

### Typography

Two faces, deliberately contrasted:

- **Display** — Fraunces, always Light Italic with `"SOFT" 0, "WONK" 1`. Page titles and pronunciation guides.
- **Body/UI** — Manrope for everything else, including the wordmark (Bold, caps, 0.22em tracking).

| Token | Size | Weight | Line height | Notes |
|---|---|---|---|---|
| `display` | 36px | 300 | 40px | page titles, Fraunces italic |
| `h1` | 24px | 300 | 1.2 | Fraunces italic |
| `h2` | 20px | 600 | 1.3 | |
| `lead` | 20px | 300 | 1.5 | the airy intro paragraph on category pages |
| `body` | 16px | 400 | 1.5 | |
| `body-bold` | 16px | 600 | 1.5 | |
| `small` | 14px | 400 | 1.4 | |
| `eyebrow` | 11px | 600 | 1.35 | uppercase, 0.14em tracking, indigo, led by a 20×2px near-black rule |
| `wordmark` | 18px | 700 | 1.35 | uppercase, 0.22em tracking |

### Shape

- Cards: 24px radius — `rounded-card`.
- Category tiles: 18px — `rounded-tile`. Translate input: 20px — `rounded-field`.
- Inset images: 24px radius — `rounded-image`.
- Buttons, chips and inputs-as-links: fully rounded
- Press state: `scale(0.98)`, 100ms. Hover: mint wash (`bg-sand/60`), no lift or shadow.

### Implementation note: token naming

`:root` holds the tokens above under these exact names — that is the contract. Tailwind's `@theme inline` then maps them to shorter utility names, because these `--text-*` colour names collide with Tailwind v4's own `--text-*` font-size namespace:

```
bg-canvas, bg-card, bg-sand, bg-charcoal, bg-rule
text-brand, text-ink, text-muted, text-inverse
border-hairline, border-blush
```

`--border-brand` maps to `border-blush` specifically, not `border-brand` — a literal `border-brand` utility resolves to `--brand`. Both are indigo today, but keep the mapping so the two can diverge.

### The layout decision that matters

The editorial reference shows one large card per screen with a carousel. **Do not build that.** It's beautiful for browsing and terrible for someone standing at a counter who needs a phrase in four seconds.

Instead: **editorial header, dense body.** Each category page opens with a full-bleed banner image, an eyebrow label, a title, and a light airy lead paragraph — that's where the magazine feel lives. Below it, a plain scannable list of phrase cards. The look is editorial; the interaction is fast.

### Navigation

Header bar: hamburger left, wordmark centered, account avatar right. No floating bottom dock.

---

## 6. Screens

| Route | Purpose |
|---|---|
| `/` | Home. Wordmark, freeform translate entry point, pinned essentials, the "Your trip" card (section 14), 2-column category grid. |
| `/phrasebook/[category]` | Editorial banner + phrase list for one category, grouped by moment (section 14). |
| `/translate` | Freeform input, result card with literal + natural + cultural note + pronunciation. |
| `/vault` | Saved phrases. Filter by category. |
| `/api/translate` | POST. Server route → Anthropic. |
| `/cards` | Show cards: list, create, edit. M5 — see section 12. |
| `/cards/[id]` | Full-screen show mode for one card. M5. |
| `/trip` | Trip prep: describe the trip, preview generated phrases, save them to the vault. M6 — see section 13. |
| `/api/trip-pack` | POST. Server route → Anthropic. Generates a batch of phrases for one trip. M6. |

Every list screen needs three states beyond default: loading (skeleton cards, `--bg-card-subtle` blocks, `animate-pulse`), empty (dashed border, a clear invitation to act, never an apology), and error (brand-tinted card, plain statement of what failed, retry button). Error copy names the problem and the fix — it does not apologize and does not mention the AI provider by name.

---

## 7. Data model

### Tables (Postgres)

```sql
-- Shared, read-only content. Source of truth for every language pack.
create table phrases (
  id             text not null,          -- e.g. 'dining-menu'; same id across locales
  locale         text not null,          -- 'es-419', 'fr-FR', 'de-DE'
  category       text not null check (category in
                   ('greetings','dining','transit','shopping','lodging','emergency','general')),
  source_text    text not null,          -- English
  literal        text not null,
  natural_text   text not null,         -- "natural" is reserved in Postgres; aliased to natural
  cultural_note  text not null default '',
  pronunciation  text not null default '',
  sort_order     int  not null default 0,
  moment         text,                   -- M8: sub-group within the category; null = ungrouped
  review         text not null default 'ok' check (review in ('ok','draft')),  -- M8: 'draft' = not yet read by a fluent speaker
  primary key (id, locale)
);

-- M8 (section 14). What the other person is likely to say back.
create table phrase_replies (
  phrase_id   text not null,
  locale      text not null,
  sort_order  int  not null,
  reply       text not null,           -- as the traveller will hear it
  meaning     text not null,           -- English
  review      text not null default 'ok' check (review in ('ok','draft')),
  primary key (phrase_id, locale, sort_order),
  foreign key (phrase_id, locale) references phrases (id, locale)
);

-- M8 (section 14). Options for a phrase whose text contains one {slot}.
create table phrase_slot_options (
  phrase_id      text not null,
  locale         text not null,
  option_id      text not null,        -- lowercase English slug, permanent
  sort_order     int  not null,
  source_text    text not null,        -- English fragment
  literal        text not null,
  natural_text   text not null,
  pronunciation  text not null,
  review         text not null default 'ok' check (review in ('ok','draft')),
  primary key (phrase_id, locale, option_id),
  foreign key (phrase_id, locale) references phrases (id, locale)
);

-- Per-user settings. user_id is the Neon Auth user id.
create table user_settings (
  user_id          text primary key,
  preferred_locale text not null default 'es-419',
  speaker_gender   text not null default 'neutral'
                     check (speaker_gender in ('neutral','feminine','masculine')),
  -- Onboarding answers (migration 002). Null = not answered.
  destination      text check (destination ~ '^[A-Z]{2}$'),          -- ISO 3166-1 alpha-2
  travel_month     text check (travel_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),  -- YYYY-MM
  spanish_comfort  text check (spanish_comfort in ('none','basic','conversational')),
  updated_at       timestamptz not null default now()
);

create table trip_packs (
  id           uuid primary key,           -- client-generated
  user_id      text not null,
  locale       text not null,
  title        varchar(60)  not null,
  description  varchar(500) not null,
  phrase_count int not null,
  created_at   timestamptz not null default now()
);

create table saved_phrases (
  id             uuid primary key,         -- client-generated
  user_id        text not null,
  locale         text not null,
  source_text    text not null,
  literal        text not null,
  natural_text   text not null,         -- "natural" is reserved in Postgres; aliased to natural
  cultural_note  text not null default '',
  pronunciation  text not null,
  category       text not null,
  trip_pack_id   uuid references trip_packs(id),
  replies        jsonb not null default '[]',  -- M8: [{ "text", "meaning" }], section 14
  saved_at       timestamptz not null,
  updated_at     timestamptz not null,
  deleted_at     timestamptz,             -- tombstone
  synced_at      timestamptz not null default now()  -- server clock; the pull cursor
);
create unique index saved_phrases_dedupe
  on saved_phrases (user_id, locale, lower(trim(source_text)))
  where deleted_at is null;
create index saved_phrases_sync on saved_phrases (user_id, synced_at);

create table show_cards (
  id             uuid primary key,         -- client-generated
  user_id        text not null,
  locale         text not null,
  kind           text not null check (kind in ('allergy','diet','medical','address','custom')),
  title          text not null,            -- the user's own English label, e.g. "Peanut allergy"
  source_text    text not null,            -- for 'address', the address verbatim
  literal        text not null,            -- the Spanish shown in show mode (section 12)
  natural_text   text not null,         -- "natural" is reserved in Postgres; aliased to natural
  cultural_note  text not null default '',
  pronunciation  text not null,
  created_at     timestamptz not null,
  updated_at     timestamptz not null,
  deleted_at     timestamptz,
  synced_at      timestamptz not null default now()
);
create index show_cards_sync on show_cards (user_id, synced_at);
```

### TypeScript shapes

```ts
interface UserSettings {
  preferredLocale: string;       // 'es-419'
  speakerGender: SpeakerGender;  // 'neutral' | 'feminine' | 'masculine'; default 'neutral'. Read from M5 (section 12)
  updatedAt: string;             // ISO timestamp
}

interface SavedPhrase {
  id: string;                    // client-generated UUID
  locale: string;                // REQUIRED. 'es-419' in v1.
  sourceText: string;            // English
  literal: string;
  natural: string;               // how a native speaker would actually say it
  culturalNote: string;          // '' when there is nothing to say
  pronunciation: string;
  category: Category;
  tripPackId?: string;           // set when saved from a trip pack (section 13); absent otherwise
  replies?: LikelyReply[];       // M8 (section 14); absent on rows saved before it
  savedAt: string;
  updatedAt: string;
  deletedAt?: string;            // tombstone; present = deleted
}

interface ShowCard {             // written from M5 (section 12)
  id: string;
  locale: string;                // REQUIRED, same rule as SavedPhrase
  kind: ShowCardKind;            // 'allergy' | 'diet' | 'medical' | 'address' | 'custom'
  title: string;
  sourceText: string;
  literal: string;
  natural: string;
  culturalNote: string;
  pronunciation: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface TripPack {             // written from M6 (section 13)
  id: string;
  locale: string;                // REQUIRED
  title: string;                 // user-entered, ≤ 60 chars, e.g. "Mexico City, 2 weeks"
  description: string;           // the trip description sent to the model
  phraseCount: number;
  createdAt: string;
}
```

Email and login times live in Neon Auth, not in our tables.

`ShowCardKind` and `SpeakerGender` slugs follow the same rule as category slugs (section 2, rule 3): lowercase English, permanent, display labels in `src/lib/labels.ts`.

**M3 ships all tables.** `show_cards` and `trip_packs` have no writer until M5 and M6, but their schema and types land in M3 so neither milestone has to reopen them.

### Access control

There are no database-side rules to lean on, so the server enforces ownership:

- Every route handler that touches user tables calls `requireUser(request)` first. It returns the verified Neon Auth user id or responds 401.
- Every user-table query filters on `user_id = $1` with that verified id, never with an id from the request body.
- `phrases` is readable without auth and writable only by migrations and the seed script.
- Postgres row-level security is a possible later hardening, not a v1 requirement.

### The phrase library

- `phrases` in Neon is the source of truth. It is seeded from `data/phrases/*.csv` (one file per locale, shared ids across files).
- A script exports it to a committed JSON snapshot bundled into the app. The phrasebook therefore works with zero signal on first load, and builds never need database access.
- Re-export and commit the snapshot whenever the table changes.
- From M8 the snapshot also carries each phrase's `moment`, `review`, replies and slot options (section 14).

### Local-first sync

- Every user-data write goes to IndexedDB first. The UI reads from IndexedDB and updates immediately.
- Each write also appends an operation to an **outbox** store in IndexedDB.
- When online and signed in, the outbox flushes to `POST /api/sync`. Then `GET /api/sync?since=<cursor>` pulls rows changed on other devices.
- Ids are client-generated UUIDs, so a row created offline keeps its id after syncing.
- Deletes are tombstones (`deletedAt`), so they sync like any other write.
- Conflicts: last write wins on `updatedAt` (the client's clock), resolved on the server.
- The pull cursor is `synced_at`, the server's clock, set on every write — never `updatedAt`, which a device with a wrong clock could set to anything. Each pull re-reads a 30-second overlap so a late-committing write isn't skipped; applying a row twice is harmless.
- Duplicates (same dedupe key, different id, e.g. the same phrase saved on two offline devices) are stored as tombstones, so the sending device converges on the surviving row at its next pull.
- On sign-in, local data with no owner is adopted by that account. Local data owned by a different account is cleared, never uploaded. On sign-out, the device's copy is cleared; the server keeps it.
- Logged out: the same IndexedDB stores, and the outbox waits. On sign-in it flushes and the user's server rows are pulled down. There is no separate "upload localStorage on login" path.
- Build the sync as one helper parameterised by table, dedupe key, and timestamp field, not code specific to saved phrases. M3 uses it for `saved_phrases` (dedupe on `locale + normalized sourceText`). M5 reuses it for `show_cards` (dedupe on `kind + locale + normalized sourceText`).
- Trip packs are created online only (they need the model call) and are cached into IndexedDB after creation.
- Logged out, `speakerGender` lives in IndexedDB and is written to `user_settings` on sign-in if the server row still has the default.
- The onboarding answers (`destination`, `travelMonth`, `spanishComfort`) live in IndexedDB too. On sign-in each is merged on its own: if the server has no value, the device's is uploaded; if the server has one, it wins. While signed in, a local change PUTs only the changed fields to `/api/settings`.
- The service worker never caches `/api/sync`. Sync runs on the `online` event and on app focus.

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

From M8 the template takes two more variables, `{{DESTINATION_NAME}}` and `{{SPANISH_COMFORT}}`, and the response gains `likelyReplies`. Their rules are in section 14.

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
- The phrase library ships in the bundle (section 7). User data is read from IndexedDB; the network is only for sync. The outbox is hand-rolled, so keep it to the one helper.
- `/api/translate` and `/api/trip-pack` are network-only; offline shows the error state with an offline-specific message. Exception from M6: `/translate` first checks the recent-translations cache (section 13).
- `/cards` and `/cards/[id]` render entirely from IndexedDB, signed in or not. No server fetch on that path. A show card that needs signal to open is useless.
- The phrasebook and vault must be fully usable with zero signal. That's the whole point of the product.
- iOS: `viewport-fit=cover` plus `env(safe-area-inset-top)` on the header, or it bleeds into the Dynamic Island

---

## 10. Build order

Ship each milestone to Vercel before starting the next.

**M0 — Pipeline.** Scaffold, `brand.ts`, tokens, header with wordmark. Deploy to Vercel. Nothing else. Prove the deploy works before there's anything complicated to blame.

**M1 — Static phrasebook.** Categories, preset phrases from a local file, editorial category pages, phrase cards, text-to-speech. No auth, no database, no AI. This is already a useful app.

**M2 — Live translation.** `/translate`, the Anthropic route handler, result card, all three states. No auth yet — the route is public, protected only by an input-length cap and a coarse per-IP throttle. Auth arrives in M3.

**M3 — Accounts and vault.** Neon Auth (email/password), the Neon schema and migrations, `requireUser()`, `/api/sync` (push and pull), the IndexedDB stores and outbox, and the generic sync helper. All five tables ship, even though `show_cards` and `trip_packs` have no writer until M5 and M6. Also the `phrases` table, seeded from `data/phrases/*.csv`, and the snapshot export script.

**M4 — Offline.** Service worker, manifest, iOS install, offline states. Shell caching is route-pattern based per section 9. User-data sync is already offline-tolerant from M3, so M4 is shell caching and offline UI states.

**M5 — Show cards.** `/cards`, `/cards/[id]`, show mode, the five kinds, all three list states. The speaker-gender setting, and the matching optional field on `/api/translate`. See section 12.

**M6 — Trip pack.** `/trip`, `/api/trip-pack` behind sign-in (uses `requireUser()`), save-to-vault with `tripPackId`, vault filter by trip, and the recent-translations cache on `/translate`. See section 13.

**M7 — Menu scan.** Proposed in `docs/proposals/menu-scan.md`; not yet approved. Numbers are names, not an order: M8 is built first.

**M8 — Companion pass.** Six improvements to what already exists, built as phases 1–6 in section 14, each shipped before the next. The owner has approved running the phases back to back.

Write ~40 preset phrases across the six visible categories before M1 — evenly spread, not 5 dining and 1 shopping like the old set.

---

## 11. Reference material

The old repo (`Puriya-translation-project-march-2026`) is a reference, not a template — and a limited one. It is a single-screen Vite SPA (one 472-line `App.tsx`, no routing, no phrasebook, no categories, no text-to-speech) built against Google Gemini, not Anthropic.

Take from it: the `cn()` class-name helper (`clsx` + `tailwind-merge`), the Tailwind `@theme` token pattern, two of its colour values (`#A3D9C9` and `#F4EBD0`, both already folded into section 5), and the EB Garamond / Inter font pairing. Nothing from its data layer carries over.

Ignore everything else: its translation service (Gemini, a different response shape, a hardcoded region in the prompt), its Firestore schema, rules, and Auth provider (this build uses Neon; see section 3), and its app name (invented — this project is not called Sentido).

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

### Speaker gender

Spanish marks the speaker's gender in phrases travelers say constantly: *alérgico/alérgica*, *cansado/cansada*, *vegetariano/vegetariana*. The user chooses it, and the model never guesses.

- A setting (in the nav drawer) with three permanent slugs: `neutral` (the default), `feminine`, `masculine`. Display labels live in `src/lib/labels.ts`. Stored in `user_settings.speaker_gender`, or in IndexedDB when logged out (section 7).
- `/api/translate` gains an optional `speakerGender` request field, defaulting to `neutral`. The client sends the current setting on every call: show cards, `/translate`, and the trip pack.
- The section 8 template gains a `{{SPEAKER_GENDER}}` variable and one rule: *"When the speaker refers to themselves, use {{SPEAKER_GENDER}} grammatical agreement. If it is neutral, prefer constructions that avoid gendered agreement — 'Tengo alergia a…' rather than 'Soy alérgico a…' — and use the masculine form only where no natural neutral phrasing exists."*
- Changing the setting does not re-translate existing show cards. Each card stores the translation it was made with. Editing a card re-translates it with the current setting.

### Creating a card

- `allergy`, `diet`, `medical`, `custom`: the user edits the English and the client POSTs it to `/api/translate` with the current `speakerGender`. The result is stored on the card, so creating a card needs signal but showing it never does.
- `address`: **no model call.** The card shows a fixed localized lead line ("Por favor, lléveme a:") from `src/lib/labels.ts`, followed by the address exactly as typed. Street names and building names must not be translated, and the model has no reason to touch them.
- Editing the English text re-translates the card and needs signal. Offline, the text field is disabled with a plain statement why. Renaming and deleting work offline.

### Show mode (`/cards/[id]`)

- Full screen, `--bg-dark` background, `--text-inverse` text. The header is hidden. A close control sits top-left, inside `env(safe-area-inset-top)`.
- The Spanish is set in the `display` token (32px/700) at minimum. It shows the card's **`literal`** field, not `natural`: section 8 defines `literal` as "correct, neutral, safe in formal settings", which is the register you want in front of a pharmacist.
- The user's English `sourceText` sits underneath in `small` and `--text-muted`, so a bilingual reader can check it and the user knows exactly what they're showing.
- Speak button (existing `useSpeech`) for reading it aloud.
- The Screen Wake Lock API keeps the screen on while show mode is open. This is progressive: where the API is missing, nothing breaks and nothing is shown.
- No brand accents in show mode. It's a high-contrast reading surface, not a branded one.
- From M8 the same surface also shows any phrase, as an overlay (section 14). Show cards keep `literal`; phrases show `natural`.

### List (`/cards`)

The three list states from section 6 apply. The empty state invites the user to make their first card and offers the five kinds as tiles with a lucide icon for each.

---

## 13. Trip pack (M6)

Before leaving, the user describes their trip in plain English ("vegetarian, two weeks in Mexico City and Oaxaca, staying in hostels, overnight buses") and gets 25 phrases specific to it, ready to save to the vault for offline use. The preset phrasebook covers what every traveler needs. The trip pack covers what *this* traveler needs.

### Flow (`/trip`)

**Sign-in required.** Logged out, `/trip` shows a sign-in invitation in the empty-state style (section 6), not the form. A trip pack costs about 25 translations, and its value is the saved vault, which already wants an account.

1. The user enters a title (≤ 60 chars) and a description (≤ 500 chars, the same cap as `/api/translate`).
2. Generate → loading state: skeleton phrase cards plus a line saying this takes a little while. It's one request, not a stream.
3. Preview: generated phrases render as standard phrase cards, each with a checkbox, all checked by default.
4. "Save N to vault" writes a `TripPack` plus one `SavedPhrase` per checked phrase, each with `tripPackId` set, written to IndexedDB and the outbox and synced via `/api/sync` (section 7).
5. The vault gains a trip filter alongside the category filter.

### `/api/trip-pack`

- POST `{ title, description, locale, speakerGender }` → `{ phrases: Phrase[] }`, with the Neon Auth session.
- The route calls `requireUser()` before doing anything else. A missing or invalid token gets a 401, which the client shows as the error state with a sign-in action. This is the first route that knows who is calling.
- Model, effort, and sampling rules are identical to section 8: `claude-sonnet-5`, `output_config.effort: "low"`, no sampling parameters, structured outputs via `output_config.format`. The schema is an object with one `phrases` array whose items are the section 8 response shape.
- `max_tokens`: **16000.** Twenty-five phrases at roughly 150 tokens each is about 3,750 tokens of answer, and thinking counts against the cap (section 8). 16000 gives the same kind of headroom 4096 gives a single phrase while staying a plain non-streaming request. If measured latency makes the loading state painful, switch to streaming before reducing the phrase count.
- Validate every phrase's `category` with `isCategory()`, falling back to `general` exactly as `/api/translate` does. The prompt asks for 25. Accept up to 25 and truncate beyond that. Fewer than 10 is an error state, not a short pack.
- Throttle: a separate, tighter bucket in `rateLimit.ts`, keyed on the verified `uid` rather than the IP: 3 packs per user per hour. It's still the coarse in-memory throttle from M2, now keyed on an identity.
- Network-only; offline shows the error state with an offline-specific message.

### Trip-pack prompt

A separate template from section 8, with the same variables (`{{LOCALE_NAME}}` and `{{SPEAKER_GENDER}}`, never a hardcoded region). It reuses section 8's rules 2, 3, 4, 5 and 7 verbatim, so they live in one shared constant in code, not two copies that drift. It adds:

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

---

## 14. Companion pass (M8)

Six improvements to features that already exist, each judged against section 1: *does this hand someone the exact words for the moment they're in?* No new top-level routes and no new dependencies. The working plan, with the reasoning behind each choice, is `docs/proposals/companion-pass.md`; this section is the contract.

Built in this order, each phase shipped before the next:

| Phase | Feature |
|---|---|
| 1 | Show any phrase full-screen |
| 2 | Use the onboarding answers |
| 3 | "Your trip" card replaces the Daily Phrase |
| 4 | Pronunciation for every preset, then moments within categories |
| 5 | Likely replies |
| 6 | Fill-in-the-blank phrases |

### Show any phrase full-screen

- `ShowMode` splits into a presentational `ShowSurface` (the section 12 layout, speak button and wake lock) and the loader that feeds it a show card. `/cards/[id]` behaves as before.
- Any phrase opens the same surface as a **client overlay, not a route**: the phrase may come from the bundle, from a translate result held in memory, or from IndexedDB, and the overlay is handed the phrase it was opened from. It therefore works offline everywhere with no lookup and no service-worker change.
- Entry point: on a phrase card and in the essentials list, **the phrase itself is the control** — tapping the Spanish opens it, and a small expand glyph marks it as tappable. A third round button would add about 50px to every card in a list that is meant to be dense. The translate result has room, so it gets an icon button in its action row. Either way it appears only when the phrase's target language is the locale's language; an es→en result has nothing to show a local.
- The overlay shows **`natural`** (the card leads with it and speaks it). Show cards keep `literal` (section 12).
- Short phrases scale up beyond the `display` minimum. Long ones wrap at it.
- Close control, Escape, and the device's back button all close it. The overlay pushes a history entry so Back closes the overlay instead of leaving the page.
- It is a native `<dialog>` opened with `showModal()`: focus is trapped and returns to the Show button on close.

### Use the onboarding answers

- `/api/translate` and `/api/trip-pack` accept two more optional fields, `destination` (ISO 3166-1 alpha-2) and `spanishComfort`. The client sends the current settings on every call, as it does `speakerGender`.
- The server validates both: `destination` must be in `src/lib/destinations.ts` for the request's locale, `spanishComfort` one of its three slugs. An invalid value is dropped, not rejected, so an older client keeps working.
- Prompt rules, as variables — never a hardcoded country (section 2, rule 2):
  - **Destination.** `literal` stays neutral. Where people in `{{DESTINATION_NAME}}` use a different everyday word, `natural` uses it and `culturalNote` says so in one sentence. No destination means the neutral behaviour.
  - **Comfort.** `none`: the shortest polite phrasing, avoiding sounds English speakers stumble on where an equal alternative exists. `basic`: unchanged. `conversational`: fuller, more idiomatic `natural`.
- `/trip` prefills the title from the settings ("Mexico, March 2027") and sends destination and month to the trip-pack prompt. The description stays blank.
- The recent-translations key (section 13) gains destination and comfort, so an answer cached for one country is not served for another.
- Preset phrases stay neutral. Country variants of presets are dialect-pack work (section 1).

### "Your trip" card

The mint feature card on Home. Rendered from IndexedDB, so it works offline and signed out. It replaces the Daily Phrase card, which was a language-learning pattern (section 1).

| State | What it shows |
|---|---|
| Has show cards | Up to three, as large tap targets that open show mode directly |
| Has a trip pack | The latest pack's title and first three phrases, with a link to the vault filtered to that trip |
| Has a destination, no pack | An invitation to build a pack for that trip → `/trip`, prefilled |
| Nothing yet | An invitation to make a first show card, with the five kinds as compact chips |

The card always has two blocks, cards then trip phrases, each showing its content or its invitation. The heading carries the destination and month where the date used to sit. `/vault?trip=<id>` opens the vault with that trip selected. The separate trip row on Home folds into this card. While IndexedDB loads the card holds a fixed height.

### Moments

A **moment** is a sub-group within a category ("Ordering", "Paying"). In code it is never called a situation: the phrase CSV's category column is already named `situation`, and Home labels the category grid "Situations".

- Moment slugs are lowercase English and permanent, with labels in `src/lib/labels.ts` (section 2, rule 3). They are unique within a category, not globally, so data keys on `category + moment`. The ordered list per category lives in `src/lib/moments.ts`.
- `phrases.moment` is nullable. A phrase with none falls into an unlabelled group at the end, so locales without moments keep working.
- The category page stays one scrolling page. Under the banner, a sticky row of chips jumps to each group; each group is led by an eyebrow heading. Nothing is hidden behind a tap.
- Every es-419 preset has a pronunciation guide before moments ship, so all 100 phrases show, not the 50 that had guides.

### Likely replies

```ts
interface LikelyReply {
  text: string;     // the locale's language, as the traveller will hear it
  meaning: string;  // English
}
```

`Phrase.replies?: LikelyReply[]`, at most three. No pronunciation guide: the traveller hears these, they don't say them. Each has a speak button so it can be recognised by ear.

- **Presets:** authored in `data/phrases/replies.<locale>.csv`, stored in `phrase_replies`, bundled in the snapshot. A phrase that expects no reply has none. Do not pad.
- **Translate:** the response schema gains `likelyReplies` (0–3). Prompt rule: only when the output is in the locale's language, only what a stranger would plausibly say back, an empty array when the phrase expects no reply.
- **Trip pack:** the same field, at most two per phrase. If measured latency makes the loading state worse, replies come out of trip packs and stay everywhere else.
- **Saved phrases** keep their replies: `SavedPhrase.replies`, `saved_phrases.replies` (jsonb), one more entry in the sync column map. Show cards have none.
- **UI:** a "They might say" block under the phrase. Collapsed behind a disclosure in lists; open on a translate result and in the trip-pack preview.

### Fill-in-the-blank phrases

**The app never assembles Spanish from parts.** Articles and contractions change with the noun (*el baño*, *la estación*, *al baño*), so every option is written out as a complete fragment for its own template, article included, in all four text fields. There is no shared vocabulary list.

- A template is a normal phrase whose `sourceText`, `literal`, `natural` and `pronunciation` each contain one `{slot}` marker. One slot per phrase.
- Options are authored in `data/phrases/slots.<locale>.csv`, stored in `phrase_slot_options`, bundled in the snapshot.
- The blank renders inside the sentence as a chip showing the current option. It is a native `<select>`, so phones open their own picker. Choosing an option updates the English, the Spanish, the pronunciation and what the speak button says, on the device.
- The last option is always "Something else…", which opens `/translate` with the English sentence prefilled. That path needs signal.
- Saving a filled phrase saves the resolved sentence as an ordinary `SavedPhrase`. Templates never reach the vault or the sync layer.
- Not in this version: two blanks in one phrase, free-typed blanks, numbers and times.

### Draft text and the review document

Spanish written for M8 ships before a fluent speaker has read it, and is corrected afterwards. Two things make that honest:

- Every authored row (phrase, reply, slot option) carries `review`: `draft` until a fluent speaker has read it, then `ok`.
- A phrase that is **high-stakes** and has any `draft` text shows a small alert icon (lucide `CircleAlert`) beside it. Activating it opens a short popover: "This text is still a draft. A fluent speaker hasn't checked it yet." High-stakes means the `emergency` category, the `dietary` moment, and any template about allergies or medical needs; the test lives in one function in `src/lib/review.ts`.
- Each phase that authors Spanish also writes `docs/review/<phase>.md`: a table of English, Spanish, pronunciation and an empty reviewer-notes column, for the owner to go through with a fluent speaker. Corrections come back as CSV edits that flip `review` to `ok`.

Model-generated translations are not marked. They are generated on demand and were never presented as reviewed.

### Verification

- Every phase: `npm run lint`, `npm run typecheck`, `npm run build`; a Playwright run at phone size against the dev server; the offline path with the network off; labels and keyboard access on each new control.
- Prompt changes: a script under `scripts/` runs a fixed input list across destinations and comfort levels and writes the results for the owner to read. It is a reviewed eval, not an automated test; the repo has no test runner.
- A build-time check fails the build when a reply or slot option names a phrase id that does not exist.
