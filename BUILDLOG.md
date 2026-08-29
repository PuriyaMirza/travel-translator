# BUILDLOG.md

Append-only. Entries are never rewritten or deleted — see CLAUDE.md.

---

### [2026-08-20 20:51] M0: scaffold, brand module, design tokens, header
- **Milestone:** M0
- **Files:** created — `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `vercel.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/Header.tsx`, `src/lib/brand.ts`, `src/lib/utils.ts`; rewrote `README.md`.
- **Decisions:**
  - Display font is EB Garamond — continuity with the reference repo's font pairing, over the alternatives considered (Playfair Display, a geometric sans in caps).
  - Header renders only the wordmark in M0. The hamburger and avatar slots are held open by the grid but empty — a hamburger with no menu and an avatar with no account are buttons that do nothing.
  - `rounded-card` (32px) and `rounded-image` (24px) added as named radius utilities because Tailwind v4's built-in `rounded-3xl` is 24px, not the 32px SPEC.md §5 calls for — confirmed against the emitted CSS (`--radius-3xl: 1.5rem`). Honoured the number, not the utility name.
  - `shadow-soft` implemented via `@utility` rather than as a `--shadow-*` theme token — as a token it collided with the `:root` variable of the same name and emitted a circular `--shadow-soft: var(--shadow-soft)`, which only resolved by accident of source order.
  - Tailwind's `@theme inline` renames every colour token to a short semantic name (`bg-canvas`, `text-ink`, `border-hairline`, `border-blush`, …) because SPEC.md §5's `--text-*` colour vocabulary collides head-on with Tailwind v4's own `--text-*` font-size namespace. `--border-brand` maps to `border-blush` specifically, not `border-brand` — a literal `border-brand` utility would resolve to crimson rather than the token's actual pale pink.
  - The first Vercel deployment **failed**: `Error: No Output Directory named "public" found after the Build completed.` The Vercel project had been created while `main` held only `README.md` and `SPEC.md`, so with no `package.json` to detect, framework auto-detection fell back to the "Other" preset (confirmed via the project API: `framework` was `null`). Fixed by pinning `{"framework": "nextjs"}` in `vercel.json` rather than in Vercel project settings, so the fix lives in version control and survives the project being recreated.
  - `src/lib/categories.ts` was deliberately **not** built in M0, even though SPEC.md §2 rule 3 reads as foundational — M0 is scoped as "nothing else" and that was followed literally rather than pulled forward.
- **Deviations:** none from SPEC.md's M0 scope.
- **Incomplete:** No categories, phrases, translation, or auth — all out of scope for M0.
- **Open questions:** none outstanding for M0 itself.

---

### [2026-08-20 21:21] M1: static phrasebook
- **Milestone:** M1
- **Files:** created — `src/lib/categories.ts`, `src/lib/labels.ts`, `src/lib/types.ts`, `src/lib/phrases.ts`, `src/lib/categoryMeta.ts`, `src/lib/dailyPhrase.ts`, `src/lib/useSpeech.ts`, `src/components/Eyebrow.tsx`, `src/components/SpeakButton.tsx`, `src/components/PhraseCard.tsx`, `src/components/CategoryGrid.tsx`, `src/components/CategoryBanner.tsx`, `src/components/DailyPhraseCard.tsx`, `src/components/NavDrawer.tsx`, `src/app/phrasebook/[category]/page.tsx`, `src/app/not-found.tsx`; modified — `src/app/page.tsx`, `src/components/Header.tsx`, `src/lib/utils.ts`.
- **Decisions:**
  - 42 preset phrases, exactly 7 per visible category (greetings, dining, transit, shopping, lodging, emergency), evenly spread per SPEC.md §10's instruction not to repeat the old set's lopsided split. Neutral Latin American Spanish throughout — no `vosotros`, seseo pronunciation written phonetically (`GRAH-see-ahs`, never `grah-THEE-ahs`), `culturalNote` left blank unless a traveller would genuinely get something wrong. Audited programmatically: unique ids, correct per-category counts, no lisped pronunciations, `locale` never hardcoded as a literal.
  - Phrase of the day is picked deterministically by UTC day number from the local presets, rather than calling the `/api/daily-phrase` route SPEC.md §6 describes — no AI, no network, no storage, and the home page stays prerendered (`revalidate: 3600`). That route can replace this later without touching the component.
  - Speech uses `useSyncExternalStore` rather than an effect + `useState`. Voices are external browser state that loads asynchronously; the hook's distinct server snapshot keeps the speak button out of the prerendered HTML entirely rather than rendering it and mismatching on hydration. The first implementation used an effect and was caught by an ESLint `set-state-in-effect` error — rewritten rather than suppressed.
  - The speak button is gated on a voice actually existing (`voices.length > 0`), not on the Web Speech API existing. Some environments — headless Chromium confirmed by direct probe — expose `speechSynthesis` with zero voices, where `speak()` fails silently (`error: synthesis-failed`); a button that flashes and does nothing is worse than no button. Voice preference order is `es-419 → es-US → es-MX → es-CO → es-AR →` any `es-*`, deliberately preferring Latin American voices over European Spanish, which lisps — exactly what the pronunciation guides tell the reader not to do. Verified it picks `es-MX` over `es-ES`.
  - `NavDrawer`'s open state is derived from the pathname it was opened on (`openedOn === pathname`) rather than a boolean toggled by an effect on route change — same lint rule as above, and this approach also closes the drawer correctly on the browser back button for free.
  - A bug **shipped to production** and was only caught by reading the deployed HTML, not the local build: every eyebrow label rendered as `<p class="uppercase text-brand">…</p>` with the `text-eyebrow` class silently missing, losing its 12px size, 0.1em tracking, and 500 weight. Root cause: the type scale (`text-lead`, `text-h2`, `text-eyebrow`, …) lives in Tailwind's font-size namespace, which overlaps the text-*colour* namespace; unconfigured, `tailwind-merge` read `text-eyebrow` as a colour utility and let `text-brand` silently supersede it. The blast radius was every custom type token paired with a colour anywhere `cn()` was used — `text-lead`, `text-h2`, `text-body-bold` all collapsed the same way — not just the one component that broke visibly. Fixed by registering the type scale in `tailwind-merge`'s font-size class group via `extendTailwindMerge` in `src/lib/utils.ts`. Verified in both directions: type and colour utilities now coexist, and genuine conflicts (e.g. `text-lead text-h2`) still collapse correctly.
- **Deviations:** none from SPEC.md's M1 scope.
- **Incomplete:** Category banners are flat CSS gradient washes (`linear-gradient` over the palette's accent tokens), not photography — SPEC.md §5 explicitly calls for "photography that carries the page." This is a placeholder; real images are still needed.
- **Open questions:** none outstanding for M1 itself.

---

### [2026-08-20 23:59] Correct SPEC.md, backfill this build log, update README ahead of M2
- **Milestone:** M2
- **Files:** modified — `SPEC.md`, `README.md`; created — `BUILDLOG.md` (this file).
- **Decisions:**
  - Reversed the earlier decision to gate `/api/translate` behind Firebase Auth in M2. M2 now follows SPEC.md §10's original ordering: a public route, protected only by a 500-character input cap and a coarse per-IP throttle. Full auth arrives in M3, as SPEC.md always specified. This drops `firebase-admin`, the service-account secret, and all Firebase work from M2 entirely — M2 now needs only `ANTHROPIC_API_KEY`.
  - Corrected six places in SPEC.md that described a build not present in the reference repo (`Puriya-translation-project-march-2026`) or its git history, each verified during the M0/M1 build session:
    1. The `sentido-cec08` Firebase project ID doesn't exist. The real reference project is AI-Studio-managed on a non-default Firestore database and unusable as-is.
    2. "Ported from the previous Firebase build" — the old build used Google Gemini for translation, not Anthropic, so there was no AI code to port.
    3. "The old config said 65,536" (max output tokens) — that number appears nowhere in the reference repo; its Gemini service sets no `maxOutputTokens` at all.
    4. The category-taxonomy-bug attribution in §2 rule 3 — the reference repo has no category taxonomy whatsoever (verified by grep across both its commits). The rule itself is sound and was kept; only the false historical claim was removed.
    5. "The previous build had [a floating bottom dock]" — it doesn't; the old build has a conventional top header.
    6. The reference to the old repo's "design section" — it has none, only the stock AI Studio README.
  - Also updated SPEC.md §5 to name the utilities actually implemented (`rounded-card`/`rounded-image` in place of the 24px `rounded-3xl`, and the `@theme inline` colour-token renaming, including the `border-brand` → `border-blush` footgun) and §10 to state explicitly that M2 ships without auth.
  - Updated `README.md`'s Status section (it still read "Milestone 0 — pipeline… nothing else yet," despite M0 and M1 both being merged and live) and its file-layout tree (still M0-only, missing every M1 file).
- **Deviations:** none — this entry is a documentation correction, not a code change.
- **Incomplete:** M2 itself has not been built yet; this entry is prep only. No M2 feature code was written.
- **Open questions:**
  - Category banners are still palette placeholders, carried over unresolved from M1.
  - SPEC.md §8 still recommends `temperature: 0.3`. The current Anthropic API rejects sampling parameters (`temperature`/`top_p`/`top_k`) on `claude-opus-5` — the request would return a 400. This wasn't one of the six items flagged for correction, so SPEC.md hasn't been edited to reflect it; it needs a decision before M2 code lands, and structured outputs + a low `output_config.effort` are the recommended substitute for consistency.

---

### [2026-08-28 22:30] Add implementer and reviewer subagents
- **Milestone:** M2 (tooling, no feature code)
- **Files:** created — `.claude/agents/implementer.md`, `.claude/agents/reviewer.md`.
- **Decisions:**
  - Two project subagents, both on Sonnet. `implementer` gets Read/Write/Edit/Bash; `reviewer` gets Read/Grep/Glob only, so it structurally cannot "fix" what it reviews.
  - Both prompts carry the CLAUDE.md conventions and the token footguns from the M0/M1 entries above (`border-blush`, `rounded-card`/`rounded-image`, `cn()` for type-plus-colour strings) rather than assuming an agent will read the whole build log.
  - `implementer` is told not to write BUILDLOG.md. The main session owns this append-only file and writes entries from the agent's report — two writers appending independently seemed like the wrong shape for a file whose whole contract is "never rewrite."
  - `reviewer` is told it cannot run lint/typecheck/build (no Bash) and must not claim those checks passed. Left unsaid, a review agent tends to assert green checks it never ran.
- **Deviations:** none. Tooling config, no application code touched.
- **Incomplete:** Neither agent has been exercised on a real task yet. Their prompts are written against the spec, not against observed behaviour.
- **Open questions:** none — superseded by the entry below.

---

### [2026-08-28 22:53] SPEC.md §8: structured outputs and effort, replacing temperature
- **Milestone:** M2
- **Files:** modified — `SPEC.md` (§8), `.claude/agents/reviewer.md`.
- **Decisions:**
  - Resolved the open question carried since the 2026-08-20 entry. SPEC.md §8 now specifies the response shape as a JSON schema passed via `output_config.format`, and `output_config.effort: "low"`. The old "temperature around 0.3" line is gone, replaced with an explicit **do not pass `temperature`/`top_p`/`top_k`** and the reason: current models reject sampling parameters with a 400, which fails the request outright rather than degrading.
  - Verified against the current Anthropic API reference before writing, not from memory. Three things confirmed: sampling params are removed (not merely discouraged) on current models; `format` and `effort` both live *inside* `output_config`; and top-level `output_format` is the deprecated spelling. The reviewer now checks for that deprecated spelling specifically.
  - §8 states plainly that this is **not** a rename of the temperature knob. Structured outputs fixes the response *shape*; `effort` controls *thinking depth and spend*. Neither is a determinism control and the API no longer exposes one, so two identical requests may still return differently-worded translations. Written into the spec because "effort: low is the new temperature: 0.3" is the obvious wrong inference for a future reader to draw.
  - Prompt rule 6 rewritten. It used to say "output strictly valid JSON matching the schema. No markdown fences, no commentary" — instructions that only make sense when the shape is unenforced. Against a constrained decode they are cruft, so rule 6 now just requires every field to be filled, with `culturalNote` as an empty string rather than an absent key. The reviewer flags leftovers of the old wording as cruft rather than as a bug.
  - Kept the requirement that the route handler validate `category` against the `CATEGORIES` tuple in code. A schema `enum` constrains the model, but the handler shouldn't trust a model-supplied slug to index anything without checking.
- **Deviations:** none. This is the decision the previous entry asked for.
- **Incomplete:** No M2 feature code yet. §8 is now internally consistent but has never been executed against the real API — the parameter shape is verified against documentation, not against a 200 response.
- **Open questions:**
  - **`max_tokens` ~1024 is now suspect and was deliberately left alone.** §8 still says ~1024. That number predates adaptive thinking, which is on by default on current models and whose tokens count against `max_tokens`. A translation response is a few hundred tokens, but thinking plus output could exceed 1024 and truncate mid-response. Not changed because it wasn't part of the decision handed down, and the fix depends on the model chosen in §3. Needs a human call before M2 code lands.
  - `session-handoff.txt` line 158 still calls the old "~1024, ~0.3" advice "sensible." It is a dated handoff document, and line 639 of the same file already flags temperature as rejected, so it was left as history rather than edited.
  - Category banners are still palette placeholders, carried over unresolved from M1.
