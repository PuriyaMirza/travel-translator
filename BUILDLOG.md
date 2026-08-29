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
