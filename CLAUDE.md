# CLAUDE.md

Project working rules. Read this at the start of every
session.

## Source of truth

SPEC.md is the source of truth for this project. Read
it before starting any task. If something in SPEC.md
is ambiguous or conflicts with what you find in the
code, ask me rather than guessing.

## Ground rules

- Build one milestone at a time (see SPEC.md section
  10). Do not begin the next milestone until I
  explicitly say so.
- Present a plan and get my approval before writing
  code for a new milestone.
- Ask before adding any dependency not listed in
  SPEC.md.
- Never hardcode the app name. Import it from
  src/lib/brand.ts.
- Never hardcode a locale, region, or country. Locale
  is always a parameter.
- Category slugs are lowercase English and permanent.
  Display labels are localized separately.
- No API keys in client-side code. All model calls go
  through server route handlers.
- Use lucide-react for icons. Never use emoji as UI
  icons.

## Build log

After completing each task — not each file edit, each
completed unit of work — append an entry to
BUILDLOG.md at the repo root. Create the file if it
doesn't exist. Never rewrite or delete existing
entries; only append.

Entry format:

### [YYYY-MM-DD HH:MM] <short description of the task>
- **Milestone:** M0 / M1 / M2 / M3 / M4 / M5 / M6
- **Files:** created / modified / deleted
- **Decisions:** anything I chose that SPEC.md did not
  specify, and why
- **Deviations:** anything I did that contradicts
  SPEC.md, and why
- **Incomplete:** anything stubbed, mocked, hardcoded,
  or left as a TODO
- **Open questions:** anything a human should confirm

Be blunt in Deviations and Incomplete. A log that says
everything went fine is worthless. If you hardcoded a
value to get moving, say so. If you skipped error
handling, say so.

Commit BUILDLOG.md together with the work it
describes.

## Commands

- `npm run dev` — dev server on http://localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint (flat config,
  `eslint-config-next`)
- `npm run typecheck` — `next typegen` then
  `tsc --noEmit`. Run this after touching typed routes;
  typegen writes the `LayoutProps` / `PageProps`
  globals that layout.tsx and the `[category]` page
  rely on.

No test runner is configured. Env vars are listed in
`.env.example`: `ANTHROPIC_API_KEY` (M2), `DATABASE_URL`,
`NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (M3).

Data scripts: `node scripts/build-phrase-seed.mjs` writes
`db/seed/phrases.sql` from `data/phrases/*.csv`;
`node scripts/export-phrase-snapshot.mjs` writes the
bundled `src/lib/phrases.snapshot.json` (from Neon, or
`--from-csv`). Migrations live in `db/migrations/`.

Stack: Next.js 16 (App Router, React 19), Tailwind CSS
v4 (CSS-first, no `tailwind.config`), TypeScript.
Deploys to Vercel; `vercel.json` pins
`framework: nextjs`.

## Architecture

M0–M2 shipped; M3 (Neon Postgres + Neon Auth +
IndexedDB outbox sync) is in progress. No service
worker yet — that is M4.

### The one-file rules, and where they resolve

- **Brand:** `src/lib/brand.ts` exports `brand.name`,
  `.tagline`, `.defaultLocale` (`es-419`). `layout.tsx`
  reads it for `<title>`. `viewport.themeColor` in
  layout.tsx and `theme_color` in manifest.ts duplicate
  `--bg-main` (`#F2F1EA`) because Next needs a static
  literal — keep them in step. The app icons hardcode
  navy `#1A1856` / stone `#F2F1EA` for the same reason.
- **Categories:** `src/lib/categories.ts` —
  `CATEGORIES` tuple is canonical and permanent.
  `VISIBLE_CATEGORIES` drops `general` (the model's
  fallback bucket, no home tile). `isCategory()` guards
  the `[category]` route.
- **Labels:** `src/lib/labels.ts` — localized display
  strings keyed by slug then locale. Never key logic
  off these.
- **Phrases:** `src/lib/phrases.ts` — reads the bundled
  `phrases.snapshot.json` (300 rows, 3 locales) and shows
  the es-419 rows that have a pronunciation (42, 7 per
  visible category). `src/lib/types.ts` `Phrase`
  requires `locale` on every record.
- **User data (M3):** writes go to IndexedDB first
  (`src/lib/local/`), queued in an outbox, synced by
  `src/lib/sync/engine.ts` ↔ `/api/sync`
  (`src/lib/sync/server.ts`). Every user-table query
  goes through `requireUser()` and filters on its id.
  Postgres column `natural_text` aliases to `natural`
  (`natural` is a reserved word).
- `src/lib/categoryMeta.ts` — icon + gradient wash +
  lead copy per category. Banners are CSS gradients,
  not photography (SPEC.md §5 wants photos — still a
  TODO).
- `src/lib/dailyPhrase.ts` — deterministic
  phrase-of-day by UTC day number; no network.
  Replaces the `/api/daily-phrase` route SPEC.md §6
  describes until M2.

### Design tokens — two vocabularies on purpose

`src/app/globals.css` defines SPEC.md §5 tokens under
their exact spec names in `:root` (`--bg-main`,
`--text-muted`, `--border-brand`, …) — that's the
contract. `@theme inline` then re-exports them under
short Tailwind utility names (`bg-canvas`, `text-ink`,
`border-hairline`, `border-blush`) because the spec's
`--text-*` colour names collide with Tailwind v4's
`--text-*` font-size namespace.

Footguns already paid for (see BUILDLOG.md):

- `--border-brand` → `border-blush`, NOT `border-brand`
  (which resolves to `--brand`; same indigo today, but
  the two are allowed to diverge).
- Cards use `rounded-card` (24px), category tiles
  `rounded-tile` (18px), the translate input
  `rounded-field` (20px), images `rounded-image` (24px).
- `font-display` also sets italic + Fraunces
  `"SOFT" 0, "WONK" 1` (in `@layer utilities`,
  globals.css). Spanish shown in show mode stays bold
  sans for legibility.
- `shadow-soft` is an `@utility`, not a theme token
  (token form self-references).
- `src/lib/utils.ts` `cn()` extends `tailwind-merge`
  with the type scale (`text-lead`, `text-eyebrow`, …)
  as a font-size group. Without it,
  `cn("text-eyebrow", "text-brand")` silently drops
  `text-eyebrow`. Use `cn()` for any class string
  mixing a type token with a colour.
- `useSpeech.ts` uses `useSyncExternalStore` and gates
  the speak button on `voices.length > 0` (not just API
  presence); voice preference favours `es-*` Latin
  American over `es-ES`.
