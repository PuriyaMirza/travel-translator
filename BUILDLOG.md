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

### [2026-08-21 02:20] M2: live translation
- **Milestone:** M2
- **Files:** created — `src/lib/translate.ts`, `src/lib/locale.ts`, `src/lib/rateLimit.ts`, `src/app/api/translate/route.ts`, `src/app/translate/page.tsx`, `src/components/TranslateForm.tsx`, `src/components/PhraseCardSkeleton.tsx`, `src/components/ErrorCard.tsx`, `.env.example`; modified — `src/lib/types.ts`, `src/lib/useSpeech.ts`, `src/components/PhraseCard.tsx`, `src/components/NavDrawer.tsx`, `src/app/page.tsx`, `SPEC.md`, `README.md`; added dependencies — `@anthropic-ai/sdk`, `zod`.
- **Decisions:**
  - Confirmed with the user before installing: `@anthropic-ai/sdk` is implied by SPEC.md §3's stack choice; `zod` is not mentioned anywhere in SPEC.md, so it was asked about explicitly rather than assumed. Chosen over raw JSON Schema for `output_config.format` because it gives runtime validation of the model's response for the cost of one small dependency.
  - `category` is deliberately typed as `z.string()` in the structured-output schema, not `z.enum(CATEGORIES)`, even though the schema could enforce it. The runtime `isCategory()` check in `normalizeTranslation()` is the actual defense, matching SPEC.md §2 rule 3 — the same class of bug (a translated label standing in for the slug) needs a runtime fallback to `general`, not a schema that would reject an otherwise-good translation over one bad field. Verified directly: a category of `"Comida y Bebida"` falls back to `general`; a valid slug passes through unchanged.
  - `sourceLanguage`/`targetLanguage` *are* schema-enforced (`z.enum(["en","es"])`) — there's no historical bug class to defend against there, so letting the API reject a malformed value outright is strictly better than a prompt instruction alone.
  - Model is `claude-opus-5` (SPEC.md §3: check the current model string rather than assume one). `output_config.effort: "low"` — a short, well-specified transformation doesn't need deep reasoning — plus structured outputs replace the "temperature around 0.3" consistency SPEC.md §8 originally asked for; sampling parameters are rejected outright on this model (see the Deviations note and SPEC.md's own correction). `max_tokens: 2048`, not SPEC's original ~1024 — thinking tokens count toward the limit and thinking is on by default on this model, so 1024 risked truncation.
  - Corrected SPEC.md §8 to match: the temperature guidance and the "output strictly valid JSON" instruction (a request the model can simply fail) are both replaced with what's actually implemented — structured outputs plus a stated `max_tokens`. Same treatment §5 already got in the prior housekeeping entry, applied here because the conflict was already flagged as an open question rather than left to rot a second time.
  - Translation is bidirectional (an es→en result is English), but `Phrase` and `PhraseCard` were built in M1 assuming Spanish output. Added an optional `targetLanguage?: "en" | "es"` to `Phrase`, absent (defaulting to `"es"`) on all 42 presets, and threaded it through `PhraseCard`'s `lang` attribute and `useSpeech`'s voice selection — `useSpeech.speak()` now takes a language argument and picks from a per-language voice-preference list (English adds `en-US`/`en-GB`) instead of a single memoized Spanish voice. Verified in a real browser against a stubbed speech engine: an es→en result is marked `lang="en"` and picks an English voice, not Spanish.
  - `/api/translate` stayed public per the reversed auth decision (previous entry): the only protections are the 500-character input cap in `translate.ts` and a coarse in-memory per-IP throttle (`rateLimit.ts`, 10 requests/minute, resets on cold start, doesn't survive multiple instances — deliberately weak, stops casual abuse and needs no infrastructure). Verified directly against the running route: exactly 10 requests succeed per IP per minute, the 11th returns 429, a different IP is unaffected, and the first hop of an `X-Forwarded-For` chain is used.
  - `/translate` has no full-bleed banner, unlike the category pages — there's no single category identity to illustrate, so the editorial treatment is typographic only (eyebrow, title, lead), matching SPEC.md §6's literal description of the screen rather than the category-page treatment.
  - Dropped the `server-only` package rather than adding a second unplanned dependency for one file's safety net — Node's own resolution already confines `translate.ts`'s imports to server code (only the route handler imports it), and the client-bundle grep in Verification below checks the actual boundary directly rather than trusting a lint-time guard.
  - `TranslationRequestError`'s constructor was written without a TypeScript parameter property (`this.info = info` instead of `constructor(public readonly info: ...)`) after discovering Node's native `--experimental-strip-types` can't parse that syntax — used to run the pure-function verification below without adding a test runner dependency. A plain field assignment is no less clear and removes an unnecessary compatibility trap.
- **Deviations:** none from SPEC.md's M2 scope as corrected in the prior entry (public route, no auth).
- **Incomplete:**
  - No automated test suite exists yet — verification below was run by hand (`tsx` via `npx`, not installed as a dependency) and will need re-running by hand until M3 or later introduces one.
  - Category banners are still palette placeholders, carried over unresolved from M1.
  - The live Anthropic call itself is unverified end-to-end in this environment — no `ANTHROPIC_API_KEY` is available in the build sandbox. Everything that doesn't require an actual model call was verified directly (see below); the real call needs the key set in Vercel and a pass against the deployed preview.
- **Open questions:**
  - The coarse throttle is exactly as weak as SPEC.md's ordering intends it to be. If usage on the public preview URL turns out to be a real cost problem before M3's auth lands, that's a signal to revisit, not a defect in what was built.

**Verification performed** (see PR for the full breakdown): `npm run typecheck` / `lint` / `build` all clean. Grepped the entire built client bundle (`.next/static/`) for `anthropic`, `Anthropic`, `ANTHROPIC_API_KEY`, `claude-opus`, `@anthropic-ai` — zero matches; the SDK appears only in a server chunk. Pure-function tests against `normalizeTranslation` and `isRateLimited` (11 checks, all passing) covering the bogus-category fallback, empty/whitespace `culturalNote` handling, locale attachment, and per-IP throttle isolation. HTTP-level tests against the running route: empty body, missing field, malformed JSON, and 501-character input all return 400 with no provider name in the body; the throttle triggers exactly on the 11th request per IP and leaves other IPs untouched. Full browser run (Playwright, 390×844) against a mocked `/api/translate` and a stubbed speech engine: empty state, a genuinely-observed loading skeleton under real latency (not just the network being fast), a successful es-target and a successful en-target result rendered with the correct `lang` attribute and voice, the error card with a working retry that re-submits without retyping, and no horizontal overflow.

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

---

### [2026-08-29 12:44] SPEC.md §3/§8: pin claude-sonnet-5 for runtime, max_tokens 4096
- **Milestone:** M2
- **Files:** modified — `SPEC.md` (§3, §8).
- **Decisions:**
  - Closes both open questions from the previous entry, which were always one decision: §3 now pins **`claude-sonnet-5`** for the deployed app's runtime translation calls, and §8 sets **`max_tokens: 4096`**.
  - §3 states the reasoning rather than just the string, because the interesting part is the boundary it draws: Sonnet serves the product's per-request hot path, where translation quality and cultural-note nuance are what `/api/translate` is judged on; Opus stays on the coding agents in this repo, which are a handful of long reasoning tasks with entirely different economics. The spec says explicitly not to "upgrade" the runtime call to Opus because a coding session happens to run on it — that inference is the thing most likely to erode this decision later.
  - §3 also says to raise `effort` and measure before reaching for a bigger model if translation quality turns out to be the binding constraint. Effort is the cheaper dial and the two are independent.
  - 4096 is justified in the spec on the thinking-token point, not on response size. Adaptive thinking is on by default on current models and its tokens count against `max_tokens`, so the cap budgets thinking *plus* answer. The old ~1024 was sized as though the JSON were the only output. At `effort: "low"` thinking is short, but 1024 leaves no margin and truncation would arrive as an incomplete structured output. 4096 is headroom; unused capacity is free, since output bills on tokens generated.
  - 4096 also stays well below the point where the SDKs want streaming to avoid HTTP timeouts, so `/api/translate` remains a plain non-streaming request. Worth recording, because it means the route handler stays simple by choice rather than by accident.
  - Model ID written without a date suffix, deliberately — IDs in this family carry none and appending one yields a nonexistent model.
- **Deviations:** none. This is the decision the previous entry asked for.
- **Incomplete:** Still no M2 feature code. §3 and §8 are now internally consistent and fully specified, but nothing here has been executed against the live API — the model string, parameter shape, and token budget are verified against documentation, never against a 200 response. First real call may still surprise us.
- **Open questions:**
  - `.claude/agents/reviewer.md` was **not** updated. Its translation-call checks point at §8, so `max_tokens: 4096` is covered automatically, but nothing tells it to check the §3 model pin — it would not flag a route handler calling Opus. A two-line addition would close that gap; left out because this task was scoped to SPEC.md.
  - §3's model pin is a decision, not a permanent guarantee. The spec says to reconfirm the string against the Anthropic docs before M2 code lands.
  - `session-handoff.txt` line 158 still calls the old "~1024, ~0.3" advice "sensible" — now wrong on both numbers. Still left as dated history rather than edited; line 639 of the same file already flags the temperature half.
  - Category banners are still palette placeholders, carried over unresolved from M1.

---

### [2026-08-29 21:10] Consolidate M2 onto one branch: land the live translation code against the settled spec
- **Milestone:** M2
- **Files:** modified — `SPEC.md` (§8 rule 7), `src/lib/translate.ts`, `.claude/agents/reviewer.md`; merged in from `claude/translation-app-rebuild-plan-gtstds` — `src/lib/translate.ts`, `src/lib/locale.ts`, `src/lib/rateLimit.ts`, `src/app/api/translate/route.ts`, `src/app/translate/page.tsx`, `src/components/TranslateForm.tsx`, `src/components/PhraseCardSkeleton.tsx`, `src/components/ErrorCard.tsx`, `.env.example`, `src/lib/types.ts`, `src/lib/useSpeech.ts`, `src/components/PhraseCard.tsx`, `src/components/NavDrawer.tsx`, `src/app/page.tsx`, `README.md`, `package.json`, `package-lock.json`, `.gitignore`.
- **Decisions:**
  - **The real finding this session was that M2 was already written and had been sitting unlanded.** `main` is still at M0+M1. PRs #5 and #6 were *closed, not merged*, so the subagents and the §8 structured-outputs rewrite existed only on branches; PR #4 held a complete, verified M2 implementation from an older base; PR #7 held the model/`max_tokens` decision that PR #4 predates. Three open branches, each depending on the previous one, none on `main`. This entry consolidates all of it onto one branch rather than writing M2 a second time.
  - **Model pinned to `claude-sonnet-5`, `max_tokens` 4096** — the user's call, made this session, adopting PR #7 as written. `translate.ts` had shipped `claude-opus-5` / 2048 because it was written before that decision existed. The comment above `MODEL` now carries §3's reasoning rather than just the string, because the failure mode is a future reader "upgrading" the runtime call to match whatever model the coding session runs on.
  - **SPEC.md conflict resolved in favour of the newer §8** (structured outputs, `effort`, 4096) — PR #4's older prose said the same things less precisely and named 2048. The one thing kept from PR #4's side is the canonical-slug instruction, added as **rule 7** with a note explaining why it isn't redundant: `category` is deliberately `z.string()` rather than an enum, so the prompt is the only place the seven slugs reach the model, and `isCategory()` is the backstop rather than the primary instruction. Without rule 7 the spec's prompt and the shipped prompt had drifted apart.
  - **BUILDLOG conflict resolved by keeping both sides in date order** — PR #4's `[2026-08-21 02:20]` entry now sits ahead of the `[2026-08-28]` entries, unedited, including its claims about `claude-opus-5` and 2048 that this entry supersedes. The file's contract is append-only; correcting a past entry in place would have been the wrong fix, so the correction lives here instead.
  - **Closed the `reviewer.md` gap** flagged as an open question in the entry above: it now checks the §3 model pin (Opus in a route handler is a finding, as is a date-suffixed ID) and `max_tokens: 4096`. Previously it would have passed a route handler calling the wrong model.
  - Reverted the `<!-- BEGIN:nextjs-agent-rules -->` block that `next dev` writes into `CLAUDE.md`. It is tool-generated and will reappear on every `next dev`; committing an unrequested edit into the project's own rules file seemed like a call for a human to make, not a side effect of running the dev server.
- **Deviations:** none. The model pin and token cap were decided by the user before any code was written this session, per CLAUDE.md's milestone rule.
- **Incomplete:**
  - **The live model call is still unverified against a 200.** No `ANTHROPIC_API_KEY` and no `ant` profile exist in this environment. The request does reach the API — with a deliberately invalid key it returns a genuine `401 authentication_error` from Anthropic, which proves the transport and the error mapping but says nothing about whether `output_config`, the schema, or the model string are accepted, because auth fails before parameter validation. Every claim about the request shape in this repo is still documentation-verified only. Set the key in Vercel and run one real translation against the preview before calling M2 done.
  - No automated test suite. The pure-function checks below were re-run by hand via `npx tsx`, not installed as a dependency.
  - Category banners are still palette placeholders, carried over unresolved from M1.
- **Open questions:**
  - PRs #4 and #7 are still open and are now fully superseded by this branch. They should be closed rather than merged — merging either would reintroduce the older `max_tokens`/model text.
  - `session-handoff.txt` line 158 still calls the old "~1024, ~0.3" advice "sensible," now wrong on both numbers. Left as dated history.

**Verification performed this session** (not inherited from PR #4 — everything below was re-run after the merge and the model change): `npm run lint`, `npm run typecheck`, and `npm run build` all clean; the build emits `/api/translate` as dynamic and `/translate` as static. Client-bundle containment re-checked directly — grepping `.next/static/` for `anthropic`, `Anthropic`, `ANTHROPIC_API_KEY`, `claude-sonnet`, `claude-opus`, `@anthropic-ai` returns zero matches, and `claude-sonnet-5` appears only in server chunks. Ten pure-function checks against `normalizeTranslation` and `isRateLimited` all pass, including the historical bug shape (`category: "Comida y Bebida"` falls back to `general`), whitespace-only `culturalNote` collapsing to `undefined`, locale attachment, and per-IP throttle isolation. Five HTTP checks against the running route: empty body, malformed JSON, and whitespace-only input all return 400 `empty`; a 501-character input returns 400 `too_long`; and a valid input with an invalid key returns 502 `upstream` with the message "The translation service is unavailable right now." — no provider name in the response body, with the real 401 logged server-side only (SPEC.md §6).

---

### [2026-08-29 21:20] Send anthropic-workspace-id when the API key is identity-linked
- **Milestone:** M2
- **Files:** modified — `src/lib/translate.ts`, `.env.example`.
- **Decisions:**
  - **The first real call to the deployed route failed, and it found a genuine bug.** With `ANTHROPIC_API_KEY` set on the preview, `POST /api/translate` returned 502; the Vercel runtime log shows the underlying cause was a `400 invalid_request_error` from the API: *"anthropic-workspace-id is required when authenticating with an identity-linked API key; send the id of the workspace this request acts in."* Every previous entry in this log said the request shape was "documentation-verified only." This is exactly the class of thing that gap was hiding — nothing about the parameters was wrong, but the client was unusable with the credential actually in use.
  - Fixed by reading `ANTHROPIC_WORKSPACE_ID` and passing it as an `anthropic-workspace-id` default header. **Conditional, not required:** a plain API key needs no such header and the API is happy without it, so the client is constructed with no default headers when the variable is unset. That keeps local development and any non-identity-linked key working exactly as before.
  - Spelled as `defaultHeaders` because the SDK exposes no dedicated option for this — checked `client.d.ts` rather than guessing. The SDK does read an `ANTHROPIC_CUSTOM_HEADERS` env var that could have carried the same header with no code change at all, and that was rejected deliberately: it would have made the deployment depend on an undocumented variable whose purpose no future reader could infer from this repo.
  - `.env.example` now documents both variables, including when the second one is *not* needed. The failure mode worth preventing is someone setting a plain key, seeing the new variable, and inventing a value for it.
- **Deviations:** none. SPEC.md §8 specifies request parameters and says nothing about authentication headers, so no spec change was needed.
- **Incomplete:**
  - **The call still has not returned a 200.** The header is proven to reach the wire, but whether the workspace id the user set is correct — and therefore whether `output_config`, the schema, and the model string are accepted — is unknown until the next real request. This fix removes a blocker; it does not confirm what is behind it.
  - This environment cannot POST to the preview: the egress proxy denies CONNECT to the `vercel.app` host, and the Vercel fetch tool available here is GET-only. So the verification below is against a local stub, not the live API. The remaining check has to be run from a browser or a machine outside this sandbox.
  - Category banners are still palette placeholders, carried over unresolved from M1.
- **Open questions:**
  - If the next attempt returns a 400 naming the workspace id rather than the header, the value in `ANTHROPIC_WORKSPACE_ID` is wrong, not the code — the id comes from the Anthropic console for the workspace the key belongs to.
  - PRs #4 and #7 are still open and still superseded; they should be closed rather than merged.

**Verification performed:** reproduced the shape of the original failure and confirmed the fix against a local HTTP stub standing in for the API via `ANTHROPIC_BASE_URL`, asserting on the headers actually received. With `ANTHROPIC_WORKSPACE_ID` unset the request carries no `anthropic-workspace-id` header (plain-key path unchanged); with it set to `wrkspc_test123` the header arrives on the wire with that exact value. The stub's 500 was mapped to the `upstream` error code and logged server-side without reaching the client, confirming the error path still behaves. `npm run lint`, `npm run typecheck`, `npm run build` all clean; `.next/static/` greps clean for `anthropic-workspace-id` and `ANTHROPIC_WORKSPACE_ID`, so the new variable does not reach the client bundle either.

---

### [2026-08-29 21:30] M2 verified end-to-end against the live API; M2 shipped
- **Milestone:** M2
- **Files:** modified — `README.md`, `BUILDLOG.md`.
- **Decisions:**
  - **The live model call returned a real translation on the deployed Vercel preview, with all four fields populated.** This is the first 200 this project has ever gotten from the API. Every prior entry in this log carried the same caveat — the request shape was verified against documentation, never against a response — and that caveat is now discharged. `claude-sonnet-5`, `output_config.format` with the JSON schema, `output_config.effort: "low"`, and `max_tokens: 4096` are all confirmed accepted as SPEC.md §8 specifies them. Nothing in §8 needed changing.
  - `README.md` now says M2 is shipped rather than built, and states the credential requirement, since that is what stood between "built" and "shipped."
- **Two things blocked it, neither of them in the request parameters:**
  1. **`ANTHROPIC_API_KEY` was misspelled `ANTHROPOC_API_KEY` in the Vercel environment.** The SDK saw no key at all. Worth recording because the symptom is indistinguishable from a missing key, and the variable is set in a web UI where nothing spell-checks it.
  2. **The replacement key was identity-scoped.** Those return `400 invalid_request_error` — *"anthropic-workspace-id is required when authenticating with an identity-linked API key"* — before the API evaluates any request parameter. **A workspace-scoped key fixes this with no code change**, and that is what resolved it.
- **Deviations:** none.
- **Incomplete:** nothing outstanding for M2's translation path itself.
- **Open questions:**
  - **The `ANTHROPIC_WORKSPACE_ID` header support added in the previous entry was not what fixed this, and is now unexercised code.** It was written to make an identity-scoped key work; the actual resolution was swapping to a workspace-scoped key. It is inert by construction — the client is built with no default headers when the variable is unset — so it costs nothing and still makes an identity-linked key viable for anyone who has only that. But it has never run against the real API in the configuration it was written for, and honesty requires saying so rather than letting the previous entry's verification note imply otherwise. A reasonable future call is to delete it as speculative; it was kept because the failure it addresses is one a next deployer can plausibly hit.
  - Category banners are still palette placeholders, carried over unresolved from M1 — now the oldest open item in this log.

---

### [2026-10-06 01:50] SPEC.md: add M5 (show cards) and M6 (trip pack); schema and caching hooks for M3/M4
- **Milestone:** none. This is a spec change ahead of M3, no code.
- **Files:** modified: `SPEC.md` (§6 screens, §7 data model and sync, §9 offline, §10 build order, new §12 and §13), `CLAUDE.md` (build-log milestone list now runs to M6), `BUILDLOG.md`.
- **Decisions:**
  - **Sequencing: M3 → M4 → M5 → M6.** Show cards are only worth having offline, and that needs M4's service worker. The trip pack saves to the vault, so it needs M3. Building either earlier means writing storage twice.
  - **The schema and rules land in M3, not later.** `ShowCard`, `TripPack`, and `SavedPhrase.tripPackId` are in §7 now, so M3 ships the final shape instead of a migration in M5/M6. The ownership rule is specified as a recursive `users/{uid}/{document=**}` match, and the sync helper as collection-generic, for the same reason.
  - **M4 caches app routes by pattern, not a list**, so `/cards` and `/trip` work offline without reopening the service worker.
  - **New sections were appended as §12 and §13 rather than inserted.** That avoids renumbering §8–§11, which code comments and this log cite by number.
  - **Show cards reuse `/api/translate` unchanged.** No new route, prompt, or schema for M5. Address cards make no model call at all, because addresses must not be translated.
  - **Show mode displays `literal`, not `natural`.** §8 defines `literal` as the formal-safe register, which is right for a pharmacist or kitchen. Flagged below because it's a judgement call.
  - **Show mode uses the existing `display` token (32px)** instead of a new, larger type token, to keep §5's scale closed.
  - **Trip pack:** 20 phrases, `max_tokens` 16000, non-streaming, the same model and effort as §8, and a separate 3-per-hour IP bucket. 16000 follows the SDK guidance for non-streaming ceilings. The phrase count and throttle numbers are guesses to be measured, not derived.
  - **The recent-translations cache sits in M6**, not M4, to keep M4's scope as written.
- **Deviations:** none from the existing spec. Every edit adds to §6/§7/§9/§10 without contradicting them.
- **Incomplete:**
  - **Trip-pack latency is unmeasured.** Twenty phrases in one non-streaming call could take tens of seconds. The spec says to switch to streaming if that hurts, but nobody has timed it.
  - **No starter text exists for UI locales other than English.** §12 says it's keyed by UI locale, but only English is drafted.
- **Open questions:**
  - **Gendered Spanish on show cards.** "Soy alérgico" vs "alérgica". The translation prompt doesn't know the user's gender. Options: phrase the starters so the Spanish comes out gender-neutral ("Tengo alergia a…"), or add an optional setting. Not decided.
  - **`literal` vs `natural` in show mode.** See the decision above. Confirm.
  - **Should `/api/trip-pack` require sign-in?** Enforcing it server-side means verifying a Firebase ID token, which most likely means adding `firebase-admin`, a dependency not listed in SPEC.md. As drafted, the route uses M2's public-plus-IP-throttle posture.
  - **Trip pack size: is 20 right?**
  - **Should the recent-translations cache move into M4?** It's small and it's offline behaviour.

---

### [2026-10-06 01:54] SPEC.md: settle the five M5/M6 open questions
- **Milestone:** none. Spec change ahead of M3, no code.
- **Files:** modified: `SPEC.md` (§3, §7, §10, §12, §13), `BUILDLOG.md`.
- **Decisions (the user's, recorded here):**
  1. **Speaker gender: the user picks.** `UserDoc.speakerGender` (`neutral` | `feminine` | `masculine`, default `neutral`; `localStorage` when logged out) ships in M3. M5 adds the setting, an optional `speakerGender` field on `/api/translate`, and a `{{SPEAKER_GENDER}}` prompt variable. `neutral` tells the model to prefer agreement-free phrasing ("Tengo alergia a…").
  2. **Show mode displays `literal`.** Already what §12 said; confirmed.
  3. **`/api/trip-pack` requires sign-in, verified server-side.** `firebase-admin` is now listed in §3 (approved). The throttle is keyed on `uid`, not IP. `/trip` shows a sign-in invitation when logged out. Trip packs are therefore never local-first, so `TripPack.syncedFromLocal` and the `tripPacks` sync path are removed.
  4. **Trip pack size: 25.** The prompt asks for 25 and the route truncates beyond 25. The `max_tokens` 16000 rationale was re-checked at 25 (about 3,750 answer tokens) and still holds.
  5. **The recent-translations cache stays in M6.**
- **Deviations:** none.
- **Incomplete:**
  - **The speaker-gender setting doesn't re-translate existing show cards.** A user who changes it after making cards must edit each card to refresh it. Chosen to keep M5 simple; it could surprise someone.
  - Trip-pack latency at 25 phrases is still unmeasured.
- **Open questions:**
  - **Speaker gender changes the shipped M2 route and prompt (§8) in M5.** It's additive (an optional field defaulting to today's behaviour), but it is the first edit to a shipped prompt. Worth a regression check against the M2 few-shot examples when M5 lands.
  - **"Super picks" in the user's reply was read as "user picks".** Confirm.

### [2026-10-11 12:00] Figma mockup frames for the translator flow
- **Milestone:** M0–M6 (design only; no code touched)
- **Files:** modified BUILDLOG.md. Figma page "Language App" (file z1KG6ozWc2BW0Eg6SqX5QK, node 95:1696): created a `Voyage` color variable collection, a `Header` component, and 8 mobile frames (390×844): 01 Home, 02 Category (Food & Drink), 03 Translate empty, 04 Translate loading, 05 Translate result, 06 Translate error (offline), 07 Vault, 08 Show card (show mode).
- **Decisions:** Variables use SPEC.md §5 token names plus one extra, `error-wash` (#FEF2F2), for the crimson-tinted error card. Display face is EB Garamond Bold (SPEC §11 pairing), body is Inter. Icons are lucide SVGs imported as vectors, with literal hex strokes (not variable-bound). Sample copy is taken from src/lib/phrases.ts where possible; the pharmacy phrase and its cultural note are invented for the mockup.
- **Deviations:** Wordmark text "DIALOG" is a literal in Figma (copied from brand.ts name; Figma has no import). Banner on frame 02 is a gradient, not photography (matches current code, not SPEC §5). Frames 07 and 08 show M3/M5 screens ahead of the current milestone, as design reference only.
- **Incomplete:** No nav drawer, sign-in, /cards list, or /trip frames. No prototype links between frames. Frames are not tokenised for gradients or icon colors. Frame 03 includes a "Recent" list, which is M6 (SPEC §13).
- **Open questions:** Should the flow also cover the nav drawer/speaker-gender setting and sign-in? Is the pharmacy example OK as the canonical result sample?

### [2026-10-11 21:00] Reference phrase lists: es-419, fr-FR, de-DE (100 each)
- **Milestone:** none (reference data, not wired into the app)
- **Files:** created data/phrases/es-419.csv, data/phrases/fr-FR.csv, data/phrases/de-DE.csv; modified BUILDLOG.md
- **Decisions:** Stored under `data/`, outside `src/`, so nothing imports them. Columns: id, situation (category slug), locale, english, natural, literal. All three files share the same 100 ids and English source, so rows join across languages. es-419 = the 42 presets from src/lib/phrases.ts plus 58 new. fr/de swap two Spanish-specific rows: `greetings-little-language` ("I don't speak much French/German") and `general-pay-cash` (replaces "Do you accept dollars?"). Formal register (usted / vous / Sie). Gendered forms avoided where possible; French "Enchanté(e)" and "végétarien(ne)" keep the (e) form.
- **Deviations:** SPEC.md §1 makes other languages out of scope for v1. These files are storage only, at the user's request; no code reads them. The es-419 file has 58 phrases not in phrases.ts.
- **Incomplete:** No pronunciation or culturalNote columns, which the Phrase type requires; they must be added before any import. The 58 new Spanish phrases and all French/German rows are model-written and checked only by a second model pass, not by a native speaker. Locale tags fr-FR / de-DE are assumed.
- **Open questions:** How these get into the app (Firestore vs Neon decision still pending). Whether pronunciation respelling applies to French/German.

### [2026-10-12 00:30] Draft proposal: Firestore → Neon with local-first sync
- **Milestone:** none (planning; precedes M3)
- **Files:** created docs/proposals/neon-migration.md; modified BUILDLOG.md
- **Decisions:** Proposal only. Phrase library bundled from a Neon snapshot; user data via IndexedDB + outbox + `/api/sync`, last write wins on `updatedAt`, tombstones for deletes, client-generated UUIDs.
- **Deviations:** None yet. SPEC.md is unchanged; the proposal lists the exact SPEC edits to apply on approval.
- **Incomplete:** Neon Auth SDK package and env var names are not confirmed. No database has been created.
- **Open questions:** snake_case columns + SQL aliases vs quoted camelCase; Neon Auth vs another provider; `idb` dependency; new Neon project via the Vercel Marketplace.

### [2026-10-12 01:00] SPEC.md: switch data layer from Firestore to Neon
- **Milestone:** none (spec change; precedes M3)
- **Files:** modified SPEC.md, docs/proposals/neon-migration.md, BUILDLOG.md
- **Decisions (owner-approved):** Neon Postgres + Neon Auth (email/password); snake_case columns with SQL aliases (§2 rule 5 rewritten); `idb` approved for IndexedDB; `@neondatabase/serverless` driver; plain SQL migrations, no ORM. The owner creates the Neon project in the Neon console, not via the Vercel Marketplace.
- **Deviations:** None from the approved proposal. Spec changes: §2 rule 5, §3 stack, §7 (Postgres tables, TS shapes, access control via `requireUser()`, phrase library snapshot, IndexedDB + outbox sync), §9 offline bullets, §10 M3/M4/M6, §11, §12 speaker-gender storage, §13 trip-pack auth and storage. `syncedFromLocal` and `UserDoc` removed; `deletedAt` added; timestamps are ISO strings in TS.
- **Incomplete:** No code changes. src/lib/types.ts does not yet match the new §7 shapes; that lands with M3. Neon Auth package and env var names are not confirmed. `.env.example` does not list `DATABASE_URL` yet. The recent-translations cache (§13) still uses localStorage; that is intentional (device-only cache).
- **Open questions:** Once the Neon project exists, `DATABASE_URL` must be set in Vercel project settings. If the project is not linked through the Vercel integration, preview-branch databases won't be created automatically.

### [2026-10-12 01:30] M3: Neon schema, Neon Auth, IndexedDB outbox sync, vault
- **Milestone:** M3
- **Files:** created db/migrations/001_init.sql, db/seed/phrases.sql, scripts/{phraseCsv,build-phrase-seed,export-phrase-snapshot}.mjs, src/lib/phrases.snapshot.json, src/lib/auth/{server,client,requireUser}.ts, src/lib/db/sql.ts, src/lib/local/{db,savedPhrases}.ts, src/lib/sync/{server,engine}.ts, src/app/api/auth/[...path]/route.ts, src/app/api/sync/route.ts, src/app/auth/{actions.ts,sign-in/page.tsx,sign-up/page.tsx}, src/app/vault/page.tsx, src/components/{AccountButton,AuthForm,SaveButton,SyncProvider,VaultList}.tsx. Modified SPEC.md, CLAUDE.md, .env.example, package.json/lock, data/phrases/*.csv (added pronunciation + cultural_note columns), src/lib/{phrases,types,labels}.ts, src/app/layout.tsx, src/components/{Header,NavDrawer,PhraseCard,PhraseCardSkeleton}.tsx.
- **Neon (production branch of project travel-translator, wild-queen-99254638):** migration 001_init applied after a test on a temporary branch (dedupe index verified); 300 phrases seeded (100 per locale). Neon Auth (Managed Better Auth) enabled; trusted origins: travel-translator-phi.vercel.app, this branch's preview URL, localhost:3000. Email verification off (owner decision).
- **Decisions:** Deps added (owner-approved): @neondatabase/serverless 1.2.0, @neondatabase/auth 0.5.0-beta, idb 8.0.4. Sign-up hides `name`; it is the email's local part (owner decision). Auth and DB clients are created lazily so `next build` needs no env vars. IndexedDB database name is the fixed `phrasebook-local`, not derived from brand.name, so a rename can't orphan data. Outbox keyed per row, so repeated edits coalesce. Sign-out clears the device's copy; a different account signing in clears it before syncing. Phrasebook still shows only the 42 es-419 rows with pronunciation (owner decision); phrases.ts now reads the snapshot instead of a hardcoded array (verified identical to the old 42).
- **Deviations:** Postgres column `natural` renamed `natural_text` (reserved word); SPEC §7 updated. Added `synced_at` (server clock) to saved_phrases/show_cards as the pull cursor instead of `updated_at`, because client clocks can't be trusted for ordering; SPEC §7 updated. Added a category check constraint on saved_phrases and a trip_packs(user_id) index, neither in the spec. No `proxy.ts` route protection — nothing in M3 requires sign-in to view.
- **Incomplete:** NOT tested end to end. This environment's network policy blocks *.neon.tech, so no real sign-up, sign-in or sync ran. Verified instead: lint, typecheck, production build; the exact SQL the sync server generates, run on a throwaway Neon branch (LWW newer wins / older ignored, another user's row can't be overwritten, duplicate stored as tombstone, pull query shape). The client sync engine, IndexedDB code, auth pages and SaveButton have only been type-checked. The initial snapshot was exported with --from-csv (Neon unreachable from here); it matches the seed. Saved translation results lose `targetLanguage`, so an es→en result saved to the vault is spoken with a Spanish voice. `user_settings` and `trip_packs` have no reader or writer yet (M5/M6). Server push does 2 HTTP queries per row, fine for tens of rows, slow for hundreds. Neon Auth's shared Google OAuth provider is on by default and unused.
- **Open questions:** Owner must set DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET in Vercel (Production + Preview) before auth/sync work on deploys. Preview URLs for other branches are not in Neon Auth's trusted origins. Allow *.neon.tech in this cloud environment's network policy if end-to-end tests should run here.

### [2026-10-12 03:00] M4: service worker, manifest, icons, offline UI
- **Milestone:** M4
- **Files:** created public/sw.js, src/lib/{nav,messages,useIsOffline}.ts, src/components/{ServiceWorkerRegistrar,OfflineBanner}.tsx, src/app/{manifest.ts,apple-icon.tsx}, src/app/pwa-icon/[size]/route.tsx. Modified next.config.ts (sw.js headers), src/app/layout.tsx (appleWebApp, banner, registrar), src/components/{NavDrawer,TranslateForm}.tsx, BUILDLOG.md.
- **Decisions:** Hand-written runtime-cache worker, no dependency (Serwist needs a precache manifest and a new dep; SPEC wants pattern-based caching). Navigations are stale-while-revalidate, keyed by pathname; storing a page first caches the /_next/static JS/CSS/fonts it references, and fonts referenced from CSS. WARM message caches every URL from `warmUrls()` (nav.ts) after registration. /api/*, /auth/*, non-GET, cross-origin, Range and RSC/prefetch requests are not intercepted. Offline with no cached copy falls back to cached "/". Registration is production-only. NavDrawer renders its three top links from `NAV_LINKS`. Icons are ImageResponse routes (`/pwa-icon/{192,512,512-maskable}`, `/apple-icon`) showing the brand initial.
- **Deviations:** SPEC §9 says cache-first for the shell; navigations use stale-while-revalidate (instant from cache, refreshed in background), so cached HTML can be one deploy old. Category images are not cached specially (there are none yet; banners are CSS gradients). Icon glyph is a bold sans initial on crimson, not the serif wordmark, because next/og only bundles a sans font. Hex colours in manifest.ts and the icons duplicate --brand / --bg-main.
- **Incomplete:** No offline fallback page; the fallback is the cached "/". /cards and /trip warm URLs arrive with M5/M6 (add to nav.ts). Cache trimming of static-v1 (400 entries) is untested. No install prompt for iOS. Default favicon.ico unchanged. Not tested: SW update flow across a real deploy, Safari/iOS behaviour, or the signed-in vault offline (only the signed-out vault render was checked).
- **Open questions:** Whether to add a visible iOS "Add to Home Screen" nudge (Safari can evict site storage after ~7 days unless installed).

### [2026-10-12 05:00] M5: show cards, speaker gender
- **Milestone:** M5
- **Files:** created src/app/cards/{page,new/page,edit/page,[id]/page}.tsx, src/app/api/settings/route.ts, src/components/{ChromeGate,EditCard,NewCard,ShowCardForm,ShowCardKindTiles,ShowCardsList,ShowMode,SpeakerGenderControl}.tsx, src/lib/local/{settings,showCards}.ts, src/lib/sync/settings.ts, src/lib/{showCardMeta,showCardTranslate,useWakeLock}.ts. Modified public/sw.js, src/app/layout.tsx, src/app/api/translate/route.ts, src/lib/{translate,labels,messages,nav}.ts, src/components/{NavDrawer,SpeakButton,SyncProvider,TranslateForm}.tsx.
- **Decisions:** Edit lives at a static `/cards/edit?id=` (not `/cards/[id]/edit`) so the worker can warm it once; `/cards/new?kind=` likewise (no kind shows the five tiles). `isShowModePath()` in nav.ts matches `/cards/<x>` except `new`/`edit`; ChromeGate hides Header and OfflineBanner there. `/cards/[id]` pre-renders only `/cards/_shell`; any other id renders the same empty page on demand and ShowMode reads the id from the address bar (useSyncExternalStore) when the route param is `_shell`. The worker serves cached `/cards/_shell` for an uncached `/cards/<id>` navigation that fails; CACHE_VERSION not bumped (only a new fallback, no cache shape change). SpeakButton gained a `tone="dark"` variant because its speaking/hover states are crimson. /api/translate rejects a present-but-invalid `speakerGender` with 400 (absent = neutral). Settings: stored under the "settings" key; sign-in reconcile and PUT-on-change live in SyncProvider + src/lib/sync/settings.ts. The form blocks saving while `___` blanks remain, and blocks a second card with the same kind + text (the server dedupe would silently tombstone it). Title max 80, text max 500 (matches the translate cap). Show mode shows only `literal` + `sourceText` + speak button (no pronunciation).
- **Deviations:** SPEC §12 says the speaker-gender rule uses a `{{SPEAKER_GENDER}}` variable; the prompt is a template literal, so it is `${speakerGender}` interpolation with the same text as rule 7. Show-mode Spanish is `text-display` with `md:text-5xl`, not larger on phones. The show card's `sourceText` is the user's English as typed, not the model's echo.
- **Incomplete:** Translated kinds (allergy/diet/medical/custom), `/api/settings` and the sign-in settings reconcile were NOT run against real services (Anthropic and Neon are unreachable from this sandbox). Translated kinds were exercised with a Playwright-mocked `/api/translate` (request body confirmed `{text, speakerGender}`); `/api/settings` and `reconcileSettings` are only type-checked. Reconcile is per the plan, not last-write-wins: a gender changed offline while signed in is not retried and can be overwritten by the server value at the next sign-in. If the settings read fails at sign-in, later changes aren't PUT until the next sign-in. Rows don't get a rename/edit conflict UI beyond LWW. Wake Lock is untested (headless Chromium). The speak button is hidden in headless (no voices), so it was not clicked. No iOS/Safari check. Category/card list has no search.
- **Open questions:** Should a gender change made offline while signed in be retried (needs a pending flag or updatedAt LWW)? Is `/cards/edit?id=` acceptable vs a nested `[id]/edit` route? Should show mode also show pronunciation?

### [2026-10-12 08:00] M6: trip pack, trip filter, recent translations cache
- **Milestone:** M6
- **Files:** created src/lib/tripPack.ts, src/app/api/trip-pack/route.ts, src/app/api/trip-packs/route.ts, src/app/trip/page.tsx, src/components/TripPackBuilder.tsx, src/lib/local/{tripPacks,recentTranslations}.ts. Modified src/lib/{translate,rateLimit,messages,nav}.ts, src/lib/auth/requireUser.ts, src/lib/local/savedPhrases.ts, src/lib/sync/engine.ts, src/components/{TranslateForm,VaultList}.tsx, BUILDLOG.md.
- **Decisions:** Shared prompt rules are `sharedPromptRules` in translate.ts (literal/natural, neutral Spanish, pronunciation, cultural note, category, speaker gender); both prompts compose them; translate prompt checked byte-identical to the old one for all three genders. translate.ts now exports `client`, `MODEL`, `EFFORT`, `TranslationSchema` for tripPack.ts. Trip-pack prompt numbering follows the code (category is rule 6, gender 7), not SPEC §8's numbering where category is 7. rateLimit.ts has named buckets (`translate` 10/min per IP, `tripPack` 3/hour per user id); the trip-pack throttle runs after validation so a rejected request doesn't spend one. `requireUser()` takes an optional 401 message. Trip packs are created online only: `/api/trip-packs` POST (idempotent on id, 409 if the id belongs to someone else) then IndexedDB `tripPacks`, then phrases via `savePhrase(phrase, { tripPackId })`. phraseCount is the number of NEW phrases in the pack; if every checked phrase is already saved, no pack is created. `refreshTripPacks()` runs at the end of every successful sync pull and only notifies on change (avoids a sync loop). Post-processing also drops blank and repeated-sourceText phrases before the min-10 check, and sets targetLanguage "es" (Phrase has no sourceLanguage field). A 401 from /api/trip-pack flips the page to the sign-in invitation. Recent list shows the 10 newest of the 50 cached. New `OFFLINE_TRIP_MESSAGE` in messages.ts (existing OFFLINE_MESSAGE says "Translation"). /trip is in warmUrls() via NAV_LINKS (no duplicate entry added).
- **Deviations:** Recent-translations key includes speakerGender (SPEC §13 says text + locale only) because the translation differs by gender (§12). A tapped Recent item also shows the "Saved on this device" label when online (SPEC only specifies offline).
- **Incomplete:** Not run against real Anthropic, Neon or Neon Auth (unreachable). The `/api/trip-pack` model call, `/api/trip-packs` SQL and the real session flow are only type-checked; the signed-in /trip UI was exercised with mocked auth and API responses. No prompt-quality or latency measurement; Vercel Fluid Compute (300s) not confirmed for the project. Trip packs can't be renamed or deleted; an empty server pack remains if local writes fail after the POST. Per-card bookmark buttons remain active inside the preview. localStorage recents are not cleared on sign-out. No test runner: post-processing and rate limiter were checked with a throwaway script.
- **Open questions:** Clear recents on sign-out? Make trip packs deletable (needs DELETE route and tombstone)? Is forcing targetLanguage "es" right for future non-Spanish locales?

### [2026-10-12 11:18] Live QA of M3-M6 on Vercel preview via temporary self-test route
- **Milestone:** M3 / M4 / M5 / M6
- **Files:** created then deleted src/app/api/qa-selftest/route.ts (commit 5dc54eb added it; this commit removes it); modified BUILDLOG.md
- **Decisions:** The sandbox cannot reach *.vercel.app or *.neon.tech and the Vercel fetch tool is GET-only, so the checks ran server-side on the preview from a route gated by QA_TOKEN (preview-only env var). Results: all steps passed (allOk true). /api/sync without cookie returned 401. Sign-up for users A and B worked, and get-session returned A's id. Push and pull of a saved phrase worked. B pushing the same row id with natural "HIJACK" and a later updatedAt returned 200 but did not change A's row, and B could not see A's row. Settings PUT/GET returned feminine. /api/translate returned "¿Dónde está el baño?" with category general. /api/trip-pack returned 25 phrases in 37.3s. /api/trip-packs create and list worked. Two test users were kept on purpose: qa+a-1791803867368a@example.com and qa+b-1791803868170b@example.com (rows in neon_auth."user").
- **Deviations:** None against SPEC.md. The temporary route itself was not part of the spec and has been removed.
- **Incomplete:** Browser-level UI on a real phone is still untested: offline behaviour, service worker, show mode, wake lock, speech, install/PWA. Only the HTTP API was exercised. Test users and their saved phrase and trip pack remain in the database.
- **Open questions:** Whether to delete the two QA users and their data. Whether the in-memory rate limits behave acceptably on serverless, where each instance has its own memory.

### [2026-10-28 18:06] Pinned essentials on the home screen
- **Milestone:** post-M6 (not a SPEC.md milestone — requested directly in chat)
- **Files:** created src/lib/essentials.ts, src/components/EssentialPhrases.tsx. Modified src/app/page.tsx, src/lib/dailyPhrase.ts, src/lib/phrases.ts (comment only), data/phrases/es-419.csv, src/lib/phrases.snapshot.json, db/seed/phrases.sql, BUILDLOG.md.
- **Decisions:** Eight `general` repair phrases are pinned above the phrase of the day under "Essentials / When you're stuck": don't understand, slower, repeat, can you help, bathroom, lost, map, sorry. Pinned by id in `ESSENTIAL_PHRASE_IDS` (locale-independent; text resolves through PRESET_PHRASES and `brand.defaultLocale`); a missing id throws at build. The `general` rows had no pronunciation, so PRESET_PHRASES dropped them entirely — I wrote es-419 pronunciations for the eight (seseo, stressed syllable in caps, matching the existing rows). Snapshot regenerated with `--from-csv` and seed rebuilt; the diff is exactly those eight pronunciation fields in each file. Compact list rather than eight PhraseCards so all eight fit on one phone screen; speak button only, no save button, literal or cultural note. dailyPhrase now excludes the essentials so they never appear twice on the home page; this also keeps the daily rotation pool at the original 42, so today's phrase is unchanged.
- **Deviations:** SPEC.md §4 says `general` has no home tile. There is still no tile or route; the eight phrases appear in a pinned list instead.
- **Incomplete:** Neon's `phrases` table does NOT have the new pronunciations until db/seed/phrases.sql is applied; a later `export-phrase-snapshot.mjs` run from Neon would blank them again. `npm run build` could not run here (Google Fonts unreachable from the sandbox); lint and typecheck pass, and the home page was checked through `next dev` HTML only, not visually. The other 8 `general` rows, and all de-DE/fr-FR equivalents, still lack pronunciations. The trip-pack prompt lists PRESET_PHRASES as existing phrases, so it now also includes the eight essentials. Pronunciations were not reviewed by a native speaker.
- **Open questions:** Should "Do you speak English?" (greetings) join the pinned list? Should essentials get a save button? Apply the seed to Neon now?

### [2026-10-29 10:05] Stamp blues re-skin: tokens app-wide, Home + translate result rebuilt
- **Milestone:** post-M6 (not a SPEC.md milestone — requested directly in chat)
- **Files:** created src/components/TranslationResult.tsx. Modified src/app/globals.css, src/app/layout.tsx, src/app/manifest.ts, src/app/apple-icon.tsx, src/app/pwa-icon/[size]/route.tsx, src/app/page.tsx, src/app/translate/page.tsx, src/components/{AccountButton,CategoryGrid,DailyPhraseCard,EssentialPhrases,Eyebrow,Header,NavDrawer,SaveButton,ShowMode,SpeakButton,TranslateForm}.tsx, src/lib/{categoryMeta,labels,utils}.ts, SPEC.md §5 (+2 lines elsewhere), CLAUDE.md, BUILDLOG.md.
- **Source:** Figma file z1KG6ozWc2BW0Eg6SqX5QK (Playground Env) › Language App › "Stamp blues palette · A Light editorial" — Home (113:863) and Translate result (113:950). Only those two frames exist in this palette; the user chose "tokens app-wide + rebuild those two screens, recolor the rest".
- **Decisions:** Kept every SPEC token *name* and remapped values to the five Figma variables (surface-1 navy #1A1856, surface-2 indigo #33308A, surface-3 mint #A6DCD9, surface-4 stone #F2F1EA, accent-2 #16151C), so all other screens recolor with no per-file edits. New tokens: --accent-rule (bg-rule), text-wordmark, rounded-tile (18px), rounded-field (20px); --accent-gold removed (only the banner washes used it; washes redone from the new palette). Fonts: Fraunces (light italic, SOFT 0 / WONK 1 via `.font-display` in @layer utilities) + Manrope, both via next/font/google — no new npm dependency. Icons stay lucide (repo rule); Figma's could not be downloaded (figma.com blocked from the sandbox) so they were matched by eye: MessageCircle, Utensils, BusFront, ShoppingBag, BedDouble, Siren. Show mode's Spanish switched from font-display to bold sans so it does not become light italic. Home date is MM.DD.YYYY in UTC, the same day dailyPhrase() picks by. Locale shown in the home eyebrow via a new localeLabel() (labels.ts), not hardcoded.
- **Deviations:** (1) Essentials ("When you're stuck") is not in the Figma frame; placed above the daily phrase, styled as an outlined list. (2) Daily phrase card has no save button (Figma has none). (3) Category tiles no longer show phrase counts (Figma has none). (4) The translate result frame shows no submit button; a "Translate" indigo pill is kept under the input because the form needs one. (5) Translate page lead paragraph removed (not in the frame). (6) --text-muted is indigo, not a grey — the design has no grey; muted text is less distinct from ink than before. (7) --border-light is solid navy, so every hairline in un-redesigned screens is now a full-strength outline. (8) No shadows anywhere (--shadow-soft: none).
- **Incomplete:** Category, vault, cards, show mode, trip, auth and the translate loading/error states are recolored only — no Figma frames exist for them in Stamp blues. Lodging icon in Figma looks like it may be lucide `Sofa`, not `BedDouble` — unverified. Fonts were NOT seen locally (Google Fonts unreachable; screenshots used fallbacks); confirm on the Vercel preview. Speak buttons were not visible in screenshots (headless Chromium has no voices). App icons keep their existing letterform; only colours changed. No dark-mode work (Figma's "B Dark poster" variant not built).
- **Open questions:** Sofa vs BedDouble for lodging? Should the daily card regain a save button? Build the B Dark poster variant as a dark theme later?

### [2026-10-29 17:40] M7 Phase 0: SPEC §14, menu-scan contract, Renoir ground truth, a11y rules, agent refresh
- **Milestone:** M7 (Phase 0 of `docs/proposals/menu-scan.md` only; no feature code)
- **Files:** created `src/lib/menuScanSchema.ts`, `data/menu-fixtures/01-ja-renoir-coffee.expected.json`. Modified `SPEC.md` (§1, §3, §6, §10, new §14), `CLAUDE.md` (new Accessibility section; `test:a11y` and the `next dev` CLAUDE.md-injection footgun under Commands), `.claude/agents/implementer.md`, `.claude/agents/reviewer.md`, `docs/proposals/menu-scan.md` (status line, fixture filename, photos received), `data/menu-fixtures/README.md` (ground-truth status table), `src/lib/translate.ts` (comment only: coding agents are now Opus orchestrator + Sonnet subagents), `BUILDLOG.md`. Branch `feat/menu-scan`.
- **Decisions:**
  - Fixture JSON is named `01-ja-renoir-coffee.expected.json`, not the proposal's `renoir-coffee.expected.json`: harness D looks for a sibling of each `.jpg`. Proposal updated to match.
  - SPEC §14 copies the proposal's product content (scope, D1–D7 outcomes, contract, route, prompt rules, UI, states, a11y, eval targets) but not the orchestration plan (§4) or estimates; those stay in the proposal. §14 says it wins where the two differ.
  - SPEC §3 now also lists `zod` (already a dependency since M2, never listed) and the two approved M7 devDependencies. They are NOT installed yet; that is Phase 2.
  - Contract file adds exported `MenuPrice`, `MenuItem`, `MenuSection` types beyond the proposal's `MenuScan`, so C doesn't re-derive them. Schemas themselves are unchanged from proposal §3.2. Checked: the Renoir fixture parses with `MenuScanSchema`, and `zodOutputFormat(MenuScanSchema)` produces a `json_schema` format.
  - Renoir ground truth: 7 clear Coffee items (Vienna coffee and café au lait each Hot + Iced); the "Premiu…" and "Renoir e…" sections are kept as cut-off headings with visible text only; 黒蜜ミルク is `partial` with no price because its name is whole but its price is off the right edge; the two photo captions are clear, unpriced items in a heading-less section (per the proposal's worked example). The cut-off "Reco…" label on the right edge is treated as decoration, not an item.
  - Agent files: replaced Voyage-era rules (crimson, 32px cards, Firestore) with Stamp blues; added file-ownership, a11y, `cn()` pixel-size footgun, no-`dangerouslySetInnerHTML`, no-content-logging; reviewer's model-call checks generalised to per-route `max_tokens` (4096 / 16000 / 16000) so it doesn't flag menu-scan's 16000.
- **Deviations:** none from the proposal's Phase 0 list. SPEC §3 previously said coding agents run on Opus; changed per the proposal (subagents on Sonnet, orchestrator on Opus).
- **Incomplete:**
  - **Renoir prices are model-read, not owner-verified.** アメリカン's "870" sits under glare; I read it as clear 870. If the owner disagrees, it becomes `partial` with `prices: []`.
  - Expected JSON for fixtures 02–09 is not drafted (Phase 1, per plan).
  - English for cut-off items ("Coffee jelly &…") and descriptions are my wording; the eval matches on `original`, so wording isn't scored.
  - SPEC §5 is still headed "Voyage" and §9 still says `#B91C1C` theme / `#FAF8F5` background; both predate Stamp blues and were left alone (out of Phase 0 scope).
  - Not pushed; no PR yet.
- **Open questions:**
  - Should photo captions that duplicate a menu item (カフェゼリー＆バニラ is probably the cut-off カフェゼリー＆バ…) be rows at all? Ground truth follows the proposal and includes them; it means the table shows the same dish twice.
  - Is "American coffee" 870 legible enough to count as `clear`?
  - Fixture 05 currency: EUR (estimated) assumes France; the owner should confirm the country.

### [2026-10-29 18:05] M7 Phase 0 gate: owner answers applied; shared copy added to the contract
- **Milestone:** M7 (end of Phase 0; owner approved Phase 1)
- **Files:** modified `SPEC.md` (§14 errors and Price cell), `src/lib/messages.ts` (`MENU_*` and `OFFLINE_MENU_MESSAGE`), `data/menu-fixtures/01-ja-renoir-coffee.expected.json`, `data/menu-fixtures/README.md`, `BUILDLOG.md`.
- **Decisions (owner, 2026-10-29):** アメリカン is `partial` with no price, and any partial row with no price shows "Price unclear from photo" in the Price cell (clear rows with no price keep "—"). Photo captions stay as rows. Fixture 05 is France → EUR estimated.
- **Decisions (mine):** Error codes for `/api/menu-scan` fixed in SPEC §14 (`unauthorized`, `too_large`, `unsupported_type`, `not_a_menu`, `rate_limited`, `upstream`, `unknown`) and all user-facing copy put in `messages.ts` now, so agents B (server) and C (UI) import the same constants instead of each inventing copy. "Price unclear from photo" applies to every partial row with no price, including cut-off names, not just glare; the schema can't tell those cases apart.
- **Deviations:** none.
- **Incomplete:** Copy for too-large, not-an-image, throttled and upstream errors is my wording; not owner-reviewed.
- **Open questions:** Eval scoring for アメリカン: if the model reads "870" and calls it clear, the strict hard gate ("a price on a partial item") counts it as invented, though 870 is probably right. Harness D will report it separately so the owner can judge in Phase 3.

### [2026-10-29 18:40] M7 Phase 1 (partial): image prep (A), route + model call (B), ground truth 02–09
- **Milestone:** M7
- **Files:** created `src/lib/menuImage.ts` (agent A), `src/lib/menuScan.ts`, `src/app/api/menu-scan/route.ts` (agent B), `data/menu-fixtures/0{2..9}-*.expected.json` (me). Modified `src/lib/rateLimit.ts` (B: `menuScan` bucket, 10/hour/user), `SPEC.md` §14 (eval metric definitions), `data/menu-fixtures/README.md`, `BUILDLOG.md`. Agents C (UI) and D (eval harness) are still running; their files are deliberately NOT in this commit.
- **Decisions:**
  - A: downscale = largest size under both limits (e.g. 4032×3024 → 2212×1659, 4740 tokens; 9:16 hits exactly 4784). Canvas/encode failures map to `decode` (only two reasons exist). White background painted before drawing so transparent PNGs don't go black. Extra exports `fitMenuImage`, `MenuImageErrorReason`.
  - B: `client.messages.parse` with `MODEL`, 16000 `max_tokens`, `output_config` format + `EFFORT`; rules in `system`, image block then "Read this menu." Accepts JPEG, PNG, WebP. 110 s timeout and `maxRetries: 0` so the call ends inside `maxDuration` 120. Log line written in `scanMenu` (also for `isMenu: false`, which costs tokens). Failure logs carry only stop_reason / error name, never response content (tripPack.ts logs the whole response; not copied).
  - Eval metrics corrected in SPEC §14 after reading fixture 02: a partial item can have a clearly printed price (glare over the name only), so "invented price" now means a price where the ground truth has none, not any price on a partial item. Prices match on amount; labels are English translations, so label agreement is reported, not gated.
  - Ground-truth calls: unclear lassi prices (08) and the HOT/ICE coffees at the cut-off bottom are partial with no price; "Tostadas desde" is item "Tostadas" with a "from" price; fixture 05 cheese is one item with three options; 04's cut-off paella keeps 26,00; 04's "Entrantes" super-heading is dropped (sections are flat).
- **Deviations:** none from SPEC §14 as now written.
- **Incomplete:**
  - The model call is untested: Anthropic is unreachable from this sandbox. A's browser decode/encode paths are untested in a real browser.
  - B leaves a price with an empty `amount` in place; it should be dropped (Phase 2). The 500 message is a literal in the route, not a `messages.ts` constant (Phase 2).
  - Throttle runs before MIME/size (SPEC order), so a bad upload spends one of the 10 scans.
  - Ground truth 02–09 is model-read; no price is owner-verified yet. English names/descriptions are my wording (not scored).
- **Open questions:** Confirm the four judgment calls above during the Phase 3 price check.

### [2026-10-29 18:55] M7 Phase 1: eval harness (D)
- **Milestone:** M7
- **Files:** created `scripts/eval-menu-scan.mjs`, `scripts/menu-scan-stub-server.mjs` (agent D). Modified `.gitignore` (`data/menu-fixtures/results/`), `BUILDLOG.md`.
- **Decisions:** Sign-in is `POST /api/auth/sign-in/email` `{email, password}` with an `Origin` header, cookies replayed as a plain `Cookie` header (D traced it through `/api/auth/[...path]` to Neon Auth's route table). Runs sequentially and stops at the first 429 (INCOMPLETE, exit 1). Non-200/422 or network errors exclude that fixture and mark the run INCOMPLETE. Fixture 09's 422 is gated. "Invented items per menu" gates on the worst menu. Ratios are summed across the set. Extra `--fixtures <dir>` option for testing. Verified by me: the harness against the `--clean` stub over all 9 real fixtures gives PASS on every gate (129/129 clear prices, 111/111 clear items, 12/12 partial), confirming every ground-truth file loads and scores.
- **Deviations:** none.
- **Incomplete:** Never run against the real route. Whether Neon Auth accepts `Origin: http://localhost:3000` is unverified; if not, sign-in fails with exit 2. The cut-off metric's "not longer than expected" clause can never fail on an exact-normalised match; completed text shows up as an invented item plus an unflagged partial instead (named in the JSON's `completedBy`).
- **Open questions:** none new.

### [2026-10-29 19:10] M7 Phase 2 (part): B follow-ups, English option labels, nav + home entry
- **Milestone:** M7
- **Files:** modified `src/lib/menuScan.ts`, `src/app/api/menu-scan/route.ts`, `src/lib/messages.ts` (`MENU_UNKNOWN_MESSAGE`), `src/lib/nav.ts`, `src/app/page.tsx`, `SPEC.md` §14, `BUILDLOG.md`.
- **Decisions:**
  - Post-processing now drops a price whose amount is empty after trimming (B flagged it would render as a blank price instead of "—").
  - The route's 500 copy is `MENU_UNKNOWN_MESSAGE` instead of a literal.
  - Prompt rule 7 (and SPEC §14 rule 7) now says option labels are written in English ("1/2 Ración" → "Half portion"). The old example kept "1/2 Ración" verbatim, which contradicted the schema's "label in English" and would put Spanish in the Option column. Ground truth already uses English labels; the eval matches on amount only, so this doesn't move any metric.
  - `/menu` added to `NAV_LINKS` as "Menu scan", which also puts it in `warmUrls()` (shell works offline). Home gets a "Scan a menu" pill under the translate entry, same style, lucide `ScanText`.
- **Deviations:** none.
- **Incomplete:** Not yet done in Phase 2: swapping C's fixture stub for the real `POST /api/menu-scan`, wiring C to A's `prepareMenuImage`, the D5 devDependencies and `test:a11y`, `npm run build`, axe and screenshots. The home pill and nav link were not looked at in a browser yet.
- **Open questions:** none new.

### [2026-10-29 19:20] M7 Phase 1 done: menu-scan UI (C)
- **Milestone:** M7
- **Files:** created `src/app/menu/page.tsx`, `src/components/MenuScanner.tsx`, `src/components/MenuTable.tsx` (agent C), `BUILDLOG.md`.
- **Decisions (C's, accepted unless noted):**
  - Capture: two real file inputs, `sr-only` inside labels styled as buttons, `min-h-11`, focus ring via `has-[:focus-visible]`.
  - Table per SPEC §14 (caption, scoped `th`, English as row header, rowgroup headings, no `rowSpan`, sr-only names on continuation rows, `lang` on cells, sr-only "940 Japanese yen"). A section heading shows its original line only when it differs from the English.
  - **Column widths 28/34/16/22 with Option** (SPEC says 30/34/16/20): at 320 px the 20% Price column broke "¥1,000" mid-number. Without Option, 36/44/20 as specified. SPEC to be updated.
  - Not-a-menu, too-large, not-an-image and decode errors offer the capture buttons instead of "Try again" (resending the same photo can't succeed). Network, offline, 429 and 502 get "Try again".
  - A scan with zero items is treated as not-a-menu. Item-less sections are skipped in the table.
  - Currency names come from `Intl.DisplayNames`, which capitalises "Japanese Yen"; sr-only prices (NumberFormat) read "Japanese yen". Left as-is.
  - `ErrorCard` not reused: it has no `role="alert"` or focus target. Its style is copied inline.
  - Page title `Menu · {brand.name}`; no page-level eyebrow because the result has its own.
- **Deviations:** column widths (above). The currency picker sits under the "Your menu" heading on the left, not in the header's top-right corner as SPEC §14 says — to fix in Phase 2.
- **Incomplete:** `fetchMenuScan` still returns the Renoir fixture after 1.8 s; dev-only `?force=401|413|…` forces each error. Unknown statuses (incl. 500) reuse `MENU_UPSTREAM_MESSAGE`. Not run: `npm run build`, axe. C checked result/loading/empty/error/offline at 390 and 320 px in Playwright (no page scroll; focus moves verified for forced 401/413/422/429/502/network; Cancel returns focus to Take photo); I viewed the 320 px result screenshot.
- **Open questions:** none for the owner yet; widths and picker placement are mine to settle in Phase 2.

### [2026-10-29 19:55] M7 Phase 2 done: real scan call, a11y test suite, scanner hang fix
- **Milestone:** M7
- **Files:** created `playwright.config.ts`, `tests/a11y/menu.spec.ts`. Modified `src/components/MenuScanner.tsx`, `src/components/MenuTable.tsx`, `package.json` (`test:a11y` script; devDependencies `@playwright/test` 1.63.0 and `@axe-core/playwright` ^4.14.0, approved D5; `overrides.playwright-core` 1.63.0), `package-lock.json`, `.gitignore` (`/test-results/`, `/playwright-report/`), `CLAUDE.md` (Commands: `test:a11y`), `SPEC.md` §14 (column widths, scroll region), `BUILDLOG.md`.
- **Decisions:**
  - `fetchMenuScan` now does the real multipart `POST /api/menu-scan`; non-200 → `MenuScanFetchError(status, code, message)`; the 200 body is re-validated with `MenuScanSchema` (malformed → 502 path). Fixture import and dev `?force=` switches deleted. 500/unknown statuses now show `MENU_UNKNOWN_MESSAGE`, 502 shows `MENU_UPSTREAM_MESSAGE`.
  - Currency picker held in the top-right corner (header row no longer wraps; the eyebrow wraps beside it), per SPEC §14.
  - `@playwright/test` pinned to 1.63.0 to match the preinstalled browser. `@axe-core/playwright` pulled `playwright-core` 1.64.1, whose `Page` type didn't match; an npm `overrides` entry pins it to 1.63.0 so there is one Playwright in the tree.
  - Suite: axe with WCAG 2.0/2.1/2.2 A+AA tags, no page-level horizontal scroll, and focus assertions, for empty, loading, result (with and without Option), 422, 413, 429, 502, 401 and offline at 320 and 390 px, plus the Renoir result at 320 px with 200% root font size. `/api/menu-scan` is mocked; the real client image prep runs on the Renoir photo.
- **Bugs found and fixed by the suite:**
  1. **Scanner could hang forever on "Reading your menu…"** (about 1 run in 7). `MenuScanner` had `useEffect(() => () => abortRef.current?.abort(), [])`. React re-runs effect cleanups while keeping state (StrictMode / Fast Refresh in dev), which aborted the live scan; `start()` treats any abort as intentional and returned silently. Confirmed with temporary logging (cleanup fired, then "prepared, aborted: true"), then removed the effect: 0/20 hangs in the same loop, and the full suite passed 4 runs in a row. Aborting never stopped the server-side model call anyway. I did not prove whether production can hit the same path, but the fix removes the mechanism.
  2. **At 200% text the table scrolled horizontally inside a box keyboard users couldn't reach** (axe `scrollable-region-focusable`). The wrapper is now a focusable, labelled region with a focus ring.
- **Checks:** `npm run lint`, `npm run typecheck`, `npm run build` all clean. `npm run test:a11y`: 21/21. The client bundle contains no `ANTHROPIC_API_KEY`, no `@anthropic-ai` and no fixture menu text.
- **Deviations:** column widths 28/34/16/22 (SPEC updated to match).
- **Incomplete:**
  - Nothing has hit the real model, Neon Auth or the deployed route (Phase 3 runs that, on the owner's environment or the Vercel preview).
  - The scroll region is always a tab stop, even when nothing overflows.
  - The dev server logs a 500 from `/api/auth/get-session` (Neon env vars aren't set in this sandbox); harmless here.
  - The 200% check doubles the root font size; it is not Safari's text-size setting. Real-iPhone checks stay in the Phase 4 phone test.
- **Open questions:** none for the owner from Phase 2.

### [2026-10-29 20:00] M7 Phase 3 prep: Neon Auth trusted domain for the feat/menu-scan preview
- **Milestone:** M7
- **Files:** modified `BUILDLOG.md`. External: Neon project `wild-queen-99254638`, branch `production` (`br-summer-cloud-b8bf9vq4`), Neon Auth trusted domains.
- **Decisions (owner-approved, 2026-10-29):** added `https://travel-translator-git-feat-menu-scan-puriyas-projects-c08df284.vercel.app` (better_auth), the stable branch alias, so sign-in works on the preview for the eval run and the Phase 4 phone test. Verified by listing the domains afterwards (4 entries; the 3 existing ones unchanged).
- **Deviations:** none.
- **Incomplete:** Not tested with a real sign-in from the preview (this sandbox can't reach *.vercel.app). Whether Vercel Deployment Protection blocks the eval script on the preview is unknown.
- **Open questions:** Remove this domain (and the older `git-claude-c-e1a932` one) once M7 ships?

### [2026-10-30 08:40] M7 Phase 3: owner verified all ground-truth prices
- **Milestone:** M7
- **Files:** modified `data/menu-fixtures/README.md` (status table), `BUILDLOG.md`.
- **Decisions (owner, 2026-10-30):** every price in `01`–`08` `.expected.json` confirmed "all correct" against the photos, using a side-by-side review page, including my four judgment calls (unreadable lassi prices in 08, "Tostadas desde" as a "from" price in 03, 05's cheese as one item with three options, 04's cut-off paella keeping 26,00).
- **Deviations:** none.
- **Incomplete:** English names and descriptions were not reviewed (not scored). The eval against the preview has not run yet.
- **Open questions:** none.

### [2026-10-30 12:05] M7 Phase 3: first live eval (FAIL) and prompt tuning round 1
- **Milestone:** M7
- **Files:** modified `src/lib/menuScan.ts` (prompt rules 1–3, 7, new 9; `cleanAmount()`, `cleanLanguageTag()` in post-processing), `src/lib/menuScanSchema.ts` (`.describe()` on `amount`, item `original`, `sourceLanguage`; shape unchanged), `SPEC.md` §14 (prompt rules + server guards), `BUILDLOG.md`.
- **Eval run 1** (owner, against the preview, 2026-10-30 11:49 UTC, `claude-sonnet-5`, effort low): FAIL on every accuracy gate. Invented prices 21 (target 0), price exact 60.5% (≥98%), recall 87.4% (≥95%), worst invented items 7 (≤1), cut-off flagged 33% (≥90%). Not-a-menu 422: pass. Latency p50 9.4 s, p95 20.4 s. Currency right on 7/8 (08 said printed, expected estimated).
- **Diagnosis from the raw results (no price was made up from nothing):**
  1. Amounts carried the currency sign ("5,80€", "+5.00€", "12€") on 02, 03, 06: ~30 price misses. A real UI bug too (would render "€5,80€").
  2. `original` included descriptions or notes (07 ×4 "(salsa shropshire…)", 08 ×5 "（赤ワイン＋ジンジャー）", "(HOT or ICE)", branch notes; 05 used the "Au choix" line instead of "Fromage"). Each counted as a missed item + an invented item + invented prices.
  3. 06: supplements and "au choix" choices came back as their own rows instead of price entries/description on the dish (rule 7).
  4. `sourceLanguage` was a name ("Japanese", "Spanish") instead of a BCP 47 code: breaks `lang` for screen readers.
  5. Real accuracy misses: completed cut-off text twice (01 "カフェゼリー＆オーレ", 02 "jamón"); read three prices under glare (01 アメリカン 870, 08 milk/mango lassi); skipped the two photo captions on 01; added an accent ("Inglés"); kept "desde" in `original`; marked some glare/cut-off rows clear (02 Super nachos, 04 paella).
- **Decisions:**
  - Owner (2026-10-30): prices under glare stay "Price unclear from photo"; no credit for a probably-right guess. Rule 2 now says so explicitly.
  - Tuning step 1 only (SPEC: prompt before effort, effort before model). Effort and model unchanged.
  - Server guards so rules 2 and 9 hold regardless of the model: `cleanAmount()` strips `\p{Sc}`, 円, uppercase 3-letter codes and "euro(s)"; `cleanLanguageTag()` keeps only 2–3 letter BCP 47 tags (else ""). Checked on all 8 raw scans from run 1: every amount is now numeric; language names fall to "" (UI already handles ""). Unit cases pass for "5,80€", "+5.00€", "16 Euro", "¥870", "870円", "12 EUR", "es-419", "pt-br"→"pt-BR".
  - Harness matching left strict on purpose (exact NFKC `original`): loosening it would hide completed text.
- **Deviations:** SPEC §14 now has 9 prompt rules (was 8).
- **Incomplete:** Not re-evaluated yet; needs the owner's second run after the preview redeploys. If amounts still pass but names don't, the next lever is `effort: "medium"` (SPEC tuning step 2).
- **Open questions:** 08 currency: the model said "printed" JPY; I see no ¥ or 円 on that photo. Not gated; recheck after run 2.
