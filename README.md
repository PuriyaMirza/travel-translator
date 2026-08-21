# travel-translator

A travel phrasebook and contextual translator for English speakers travelling in
Spanish-speaking countries. v1 targets neutral Latin American Spanish (`es-419`).

See [SPEC.md](./SPEC.md) for the full product spec, architecture rules, and
build order. The app's display name and tagline live in `src/lib/brand.ts` —
they are deliberately not repeated anywhere else, including here.

## Status

**Milestones 0 and 1 are shipped and live in production.** Pipeline, design
tokens, header — plus a fully static phrasebook: 6 categories, 42 preset
phrases, editorial category pages, and text-to-speech. Still no auth, no
database, no AI.

**M2 (live translation) is next.** `/translate`, a server-side Anthropic route
handler, and the result card's three states. The route ships public in M2 —
protected only by an input-length cap and a coarse per-IP throttle — with full
auth arriving in M3, per SPEC.md §10's ordering.

Remaining after that: M3 accounts and vault · M4 offline and PWA.

See [BUILDLOG.md](./BUILDLOG.md) for the detailed build history, including
deviations and open items.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables are required yet — M2 will need `ANTHROPIC_API_KEY`.

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
│   └── phrasebook/[category]/page.tsx  Editorial category page
├── components/
│   ├── Header.tsx / NavDrawer.tsx      Header bar + slide-out nav
│   ├── CategoryGrid.tsx / CategoryBanner.tsx
│   ├── PhraseCard.tsx / SpeakButton.tsx / Eyebrow.tsx
│   └── DailyPhraseCard.tsx
└── lib/
    ├── brand.ts        Name, tagline, default locale — the only place these live
    ├── categories.ts   Canonical category slugs — lowercase English, permanent
    ├── labels.ts       Localized display labels for category slugs
    ├── types.ts        The Phrase interface
    ├── phrases.ts      42 preset phrases, 7 per category
    ├── categoryMeta.ts Icon + banner wash + lead copy per category
    ├── dailyPhrase.ts  Deterministic phrase-of-the-day picker
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
