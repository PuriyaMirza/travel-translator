# travel-translator

A travel phrasebook and contextual translator for English speakers travelling in
Spanish-speaking countries. v1 targets neutral Latin American Spanish (`es-419`).

See [SPEC.md](./SPEC.md) for the full product spec, architecture rules, and
build order. The app's display name and tagline live in `src/lib/brand.ts` —
they are deliberately not repeated anywhere else, including here.

## Status

**Milestones 0, 1 and 2 are shipped.** Pipeline and design tokens; a fully
static phrasebook (6 categories, 42 preset phrases, editorial category pages,
text-to-speech); and live translation at `/translate`, backed by a
server-side Anthropic route handler with all three states (loading, empty,
error). The route is public — protected only by a 500-character input cap and
a coarse per-IP throttle — per SPEC.md §10's ordering. Still no auth, no
database.

Remaining: M3 accounts and vault · M4 offline and PWA.

See [BUILDLOG.md](./BUILDLOG.md) for the detailed build history, including
deviations and open items.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Set `ANTHROPIC_API_KEY` to use `/translate` locally (see `.env.example`). The
rest of the app works without it.

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
│   ├── api/translate/route.ts          POST — server-side Anthropic call
│   └── phrasebook/[category]/page.tsx  Editorial category page
├── components/
│   ├── Header.tsx / NavDrawer.tsx      Header bar + slide-out nav
│   ├── CategoryGrid.tsx / CategoryBanner.tsx
│   ├── PhraseCard.tsx / SpeakButton.tsx / Eyebrow.tsx
│   ├── PhraseCardSkeleton.tsx / ErrorCard.tsx
│   ├── TranslateForm.tsx
│   └── DailyPhraseCard.tsx
└── lib/
    ├── brand.ts        Name, tagline, default locale — the only place these live
    ├── categories.ts   Canonical category slugs — lowercase English, permanent
    ├── labels.ts       Localized display labels for category slugs
    ├── locale.ts       BCP 47 tag -> human-readable name, for the prompt
    ├── types.ts        The Phrase interface
    ├── phrases.ts      42 preset phrases, 7 per category
    ├── categoryMeta.ts Icon + banner wash + lead copy per category
    ├── dailyPhrase.ts  Deterministic phrase-of-the-day picker
    ├── translate.ts    The Anthropic call, prompt, schema, normalisation
    ├── rateLimit.ts    Coarse in-memory per-IP throttle for /api/translate
    ├── useSpeech.ts    Web Speech API hook
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
