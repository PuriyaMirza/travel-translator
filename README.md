# travel-translator

A travel phrasebook and contextual translator for English speakers travelling in
Spanish-speaking countries. v1 targets neutral Latin American Spanish (`es-419`).

See [SPEC.md](./SPEC.md) for the full product spec, architecture rules, and
build order. The app's display name and tagline live in `src/lib/brand.ts` —
they are deliberately not repeated anywhere else, including here.

## Status

**Milestones 0–3 are shipped in code.** Pipeline and design tokens; a fully
static phrasebook (6 categories, 42 preset phrases, editorial category pages,
text-to-speech); live translation at `/translate` (server-side Anthropic route,
public, 500-character cap, coarse per-IP throttle); and **accounts and the
vault** — email/password sign-in at `/account`, a save button on every phrase,
and `/vault` with a category filter. Saving works logged out (device storage)
and moves into the account on sign-in.

M3 needs a Firebase project before accounts work in production: set the four
`NEXT_PUBLIC_FIREBASE_*` values in Vercel and paste `firestore.rules` into the
Firebase console (Firestore → Rules). Without them the app still runs, with
saved phrases kept on the device only. See `.env.example`.

`ANTHROPIC_API_KEY` must be set in the deployment environment. Use a
**workspace-scoped** key: an identity-scoped one is rejected with a 400
asking for an `anthropic-workspace-id`.

Remaining: M4 offline and PWA · M5 show cards · M6 trip pack.

See [BUILDLOG.md](./BUILDLOG.md) for the detailed build history, including
deviations and open items.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Set `ANTHROPIC_API_KEY` to use `/translate` locally (see `.env.example`). The
rest of the app works without it.

To work on accounts without a real Firebase project, run the emulators
(needs Java; `firebase.json` points them at `firestore.rules`):

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-travel
```

Then set `NEXT_PUBLIC_FIREBASE_EMULATORS=1`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-travel`,
and any non-empty values for the other three `NEXT_PUBLIC_FIREBASE_*` vars.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route typegen, then `tsc --noEmit` |

## Layout

```
src/
├── app/
│   ├── globals.css                     Design tokens — "Voyage", SPEC.md §5
│   ├── layout.tsx                      Fonts, metadata, header
│   ├── page.tsx                        Home — daily phrase, category grid
│   ├── not-found.tsx
│   ├── translate/page.tsx              Freeform translation
│   ├── vault/page.tsx                  Saved phrases, category filter
│   ├── account/page.tsx                Sign in / create account / sign out
│   ├── api/translate/route.ts          POST — server-side Anthropic call
│   └── phrasebook/[category]/page.tsx  Editorial category page
├── components/
│   ├── Header.tsx / NavDrawer.tsx      Header bar + slide-out nav
│   ├── CategoryGrid.tsx / CategoryBanner.tsx
│   ├── PhraseCard.tsx / SpeakButton.tsx / Eyebrow.tsx
│   ├── PhraseCardSkeleton.tsx / ErrorCard.tsx
│   ├── TranslateForm.tsx
│   ├── SaveButton.tsx / VaultList.tsx
│   ├── AccountButton.tsx / AccountPanel.tsx
│   └── DailyPhraseCard.tsx
└── lib/
    ├── brand.ts        Name, tagline, default locale — the only place these live
    ├── categories.ts   Canonical category slugs — lowercase English, permanent
    ├── labels.ts       Localized display labels for category slugs
    ├── locale.ts       BCP 47 tag -> human-readable name, for the prompt
    ├── types.ts        Phrase, plus the SPEC.md §7 data model
    ├── phrases.ts      42 preset phrases, 7 per category
    ├── categoryMeta.ts Icon + banner wash + lead copy per category
    ├── dailyPhrase.ts  Deterministic phrase-of-the-day picker
    ├── translate.ts    The Anthropic call, prompt, schema, normalisation
    ├── rateLimit.ts    Coarse in-memory per-IP throttle for /api/translate
    ├── useSpeech.ts    Web Speech API hook
    ├── firebase.ts     Firebase app, auth, offline-cached Firestore
    ├── authStore.ts    Who is signed in (useAuth)
    ├── auth.ts         Sign up / in / out, password reset
    ├── userDoc.ts      Keeps users/{uid} present and current
    ├── localFirst.ts   Collection-generic local-first sync (SPEC.md §7)
    ├── vault.ts        Saved phrases store (useVault, save, remove)
    └── utils.ts        cn() class-name helper
```

## Design tokens

`globals.css` keeps two vocabularies on purpose:

- **`:root`** holds the tokens under the exact names SPEC.md §5 gives them
  (`--bg-main`, `--text-muted`, `--border-brand`, …). That is the contract.
- **`@theme inline`** maps them into Tailwind's utility namespaces under short
  semantic names — `bg-canvas`, `text-ink`, `border-hairline`, `border-blush`.
  The rename is necessary: the spec's `--text-*` colour names collide with
  Tailwind v4's `--text-*` font-size namespace.

Cards use `rounded-card` (32px) and inset images `rounded-image` (24px) rather
than Tailwind's `rounded-3xl`, which is 24px in v4.
