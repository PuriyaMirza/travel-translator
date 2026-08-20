# travel-translator

A travel phrasebook and contextual translator for English speakers travelling in
Spanish-speaking countries. v1 targets neutral Latin American Spanish (`es-419`).

See [SPEC.md](./SPEC.md) for the full product spec, architecture rules, and
build order. The app's display name and tagline live in `src/lib/brand.ts` —
they are deliberately not repeated anywhere else, including here.

## Status

**Milestone 0 — pipeline.** Scaffold, brand module, design tokens, header with
wordmark, deployed. Nothing else yet: no auth, no database, no AI, no offline.

Milestones still to come: M1 static phrasebook · M2 live translation ·
M3 accounts and vault · M4 offline and PWA.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables are required at M0.

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
│   ├── globals.css     Design tokens — see "Voyage" in SPEC.md §5
│   ├── layout.tsx      Fonts, metadata, header
│   └── page.tsx        Home
├── components/
│   └── Header.tsx
└── lib/
    ├── brand.ts        Name, tagline, default locale — the only place these live
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
