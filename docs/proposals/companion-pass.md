# Proposal: Companion pass — deepen what already exists

Status: **approved 2026-11-13; in SPEC.md as §14 (M8).** SPEC.md is the contract; this file keeps the reasoning.

Owner decisions, 2026-11-13: D1 yes. D2 yes. D5 yes (`natural`). D6 yes (M8, built before M7). D3: Spanish ships first and is corrected after; each authoring phase also writes a review document under `docs/review/`, and high-stakes phrases with unreviewed text carry a "still a draft" marker (SPEC §14). D4 and D7 follow the recommendations below; the owner asked to be consulted only on security, monetary cost and vital dependencies. Phases run back to back and are merged as they pass.

Six improvements to features the app already has, chosen by the owner. No new surface area: no new top-level routes, no new dependencies expected. Each one is judged against the mission (SPEC.md §1): *does this hand someone the exact words for the moment they're in?*

| # | Feature | One-line result |
|---|---|---|
| F1 | Use the onboarding answers | Translations and trip packs fit the traveller's country and Spanish level |
| F2 | Replace the Daily Phrase card | The Home feature slot shows the traveller's own cards and trip phrases |
| F3 | Likely replies | Each phrase shows what the other person will probably say back, with meanings |
| F4 | Situations within categories | A category page is grouped by moment ("Ordering", "Paying"), not one flat list |
| F5 | Fill-in-the-blank phrases | "Where is ___?" with a picker, so one phrase covers many needs |
| F6 | Show any phrase full-screen | Any phrase can be turned around and shown, not only show cards |

---

## 1. What the code looks like today (verified 2026-11-12)

- **Onboarding answers are stored but unused.** `destination`, `travelMonth` and `spanishComfort` reach IndexedDB and `user_settings`. The only reader is `src/components/TripRow.tsx`, which prints "Mexico · March 2027" on Home. `/api/translate` receives only `{ text, speakerGender }`; `/api/trip-pack` receives no trip settings.
- **Half the phrase library is hidden.** `data/phrases/es-419.csv` has 100 rows. `src/lib/phrases.ts` drops any row without a pronunciation guide, so 50 show (7 in each of the six visible categories, plus 8 `general` essentials) and 50 are hidden: greetings 6, dining 9, transit 9, shopping 5, lodging 5, emergency 8, general 8. *(An earlier chat message said 58 hidden; 50 is the correct count.)*
- **The Daily Phrase card** (`DailyPhraseCard.tsx`, `dailyPhrase.ts`) picks a preset by UTC day. It is the reason Home has `revalidate = 3600`.
- **Show mode is tied to show cards.** `ShowMode.tsx` reads one `ShowCard` from IndexedDB by URL id. The layout, wake lock and speak button are not reusable as written.
- **A phrase has no room for replies, blanks or a sub-group.** `Phrase` is `sourceText / literal / natural / pronunciation / culturalNote / category`. The snapshot and the `phrases` table match that.
- **Naming collision to avoid.** The CSV column that holds the category is already called `situation`, and Home labels the category grid "Situations". The new sub-grouping therefore needs a different name in code. This plan calls it a **moment**.

---

## 2. Decisions needed from the owner

Recommendations are first. D1, D2 and D6 block the start; the rest can be answered when their phase comes up.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | Write pronunciation guides for the 50 hidden phrases as part of this work? | **Yes, as Phase 4a.** | F4 groups phrases into moments. With 7 phrases per category, each group holds about two phrases, which is not worth grouping. With all 100, groups hold three to five. |
| D2 | What fills the Home slot the Daily Phrase leaves (F2)? | **A "Your trip" card**: the traveller's show cards (one tap to show mode) and their latest trip-pack phrases, with invitations when either is empty. | It is the only content on Home that is specific to this traveller. It also gives show cards the one-tap access they lack. |
| D3 | Who checks the Spanish I write? | **You, or a fluent speaker you nominate, per phase.** | F3, F4a and F5 add roughly 300 lines of authored Spanish. I can write it to the house rules in `phrases.ts`, but a model-written phrasebook that no fluent human has read is a risk to the product's core promise. |
| D4 | In lists, are likely replies visible or behind one tap (F3)? | **Behind one tap in lists; open by default on a translate result and on a trip-pack preview.** | SPEC §5 wants a dense, scannable list. Three replies per card would roughly double its height. |
| D5 | Full-screen shows `natural` or `literal` (F6)? | **`natural` for phrases. Show cards keep `literal`.** | The phrase card leads with `natural` and speaks it, so showing something else would surprise the user. Show cards stay formal because they are the high-stakes case (SPEC §12). |
| D6 | Milestone name and order against menu scan | **Call this M8 and build it before M7 (menu scan).** | Menu scan is already committed and referenced as M7. Renumbering it churns three files for no gain. Numbers are names, not an order. |
| D7 | Do trip-pack phrases get likely replies too? | **Yes, capped at two per phrase, and measured.** | It adds about 2,000 output tokens to a request that is already slow. If the loading state gets noticeably worse, replies come out of trip packs and stay everywhere else. |

---

## 3. Feature designs

### F1 — Use the onboarding answers

**Behaviour**

- `/api/translate` and `/api/trip-pack` accept two more optional fields: `destination` (ISO code) and `spanishComfort`. The client sends the current settings on every call, the same way it already sends `speakerGender`.
- The server validates both: `destination` must be in `destinations.ts` for the request's locale; `spanishComfort` must be one of the three slugs. Anything else is dropped, not rejected, so an old client keeps working.
- Prompt changes (SPEC §8 and §13), as variables, never a hardcoded country:
  - **Destination.** `literal` stays neutral Latin American Spanish. `natural` uses the word people in `{{DESTINATION_NAME}}` actually use when it differs from the neutral one, and `culturalNote` says so in one sentence. No destination means today's behaviour.
  - **Comfort `none`.** Prefer the shortest natural phrasing that is polite, avoid sounds English speakers stumble on when an equal alternative exists, and keep likely replies (F3) simple.
  - **Comfort `basic`.** Today's behaviour.
  - **Comfort `conversational`.** Fuller, more idiomatic `natural`; the note may mention register.
- **Trip pack.** `/trip` prefills the title from the settings ("Mexico, March 2027") and passes destination and month to the prompt, so the traveller does not retype what onboarding already asked. The description stays blank; that is the part only they know.
- **Recent-translations cache.** The key gains destination and comfort (`recentKey` in `recentTranslations.ts`), otherwise a cached answer for Mexico is served after the user switches to Argentina.

**Files:** `src/lib/translate.ts`, `src/lib/tripPack.ts`, `src/app/api/translate/route.ts`, `src/app/api/trip-pack/route.ts`, `src/components/TranslateForm.tsx`, `src/components/TripPackBuilder.tsx`, `src/lib/showCardTranslate.ts`, `src/lib/local/recentTranslations.ts`.

**Does not change:** preset phrases stay neutral. Country variants of presets are the dialect-pack work SPEC §1 already defers.

**Risk:** the model over-applies regional slang. The eval in §5 exists to catch that before it ships.

### F2 — Replace the Daily Phrase card

Assumes D2. The mint feature card on Home becomes **"Your trip"**, rendered from IndexedDB, so it works offline and signed out.

| State | What the card shows |
|---|---|
| Has show cards | Up to three cards as large tap targets; a tap opens show mode directly |
| Has a trip pack | The latest pack's title and its first three phrases, with a link to the vault filtered to that trip |
| Has a destination, no pack | "Get phrases for Mexico in March" → `/trip`, prefilled (F1) |
| Nothing yet | An invitation to make a first show card, with the five kind tiles from `ShowCardKindTiles.tsx` |

- The first two states stack when both apply. The heading reads "(01) Your trip" with the destination and month on the right, where the date sits today.
- `TripRow.tsx` folds into this card and is deleted, so the trip is shown once.
- Deleted: `DailyPhraseCard.tsx`, `dailyPhrase.ts`, `formatDailyDate` and `revalidate = 3600` in `src/app/page.tsx`. SPEC §6 loses the `/api/daily-phrase` row.
- While IndexedDB loads, the card shows a skeleton of fixed height so Home does not jump.

### F3 — Likely replies

**Shape.** `Phrase` gains `replies?: { text: string; meaning: string }[]`: up to three, Spanish as the traveller will hear it, plus the English meaning. No pronunciation guide, because the traveller hears these rather than says them. Each reply has a small speak button so they can learn to recognise it by ear.

**Three sources**

1. **Presets: authored, bundled, offline.** New file `data/phrases/replies.es-419.csv` (`phrase_id, sort_order, reply, meaning`) → new table `phrase_replies` → snapshot. About 250 rows once all 100 phrases are visible. Phrases that get no real reply ("Thank you very much") have none; do not pad.
2. **Translate: generated.** The response schema gains `likelyReplies` (0–3 items). One new prompt rule: only when the output is Spanish, only replies a stranger would plausibly give, empty array when the phrase expects none.
3. **Trip pack: generated,** capped at two per phrase (D7).

**Persistence.** A saved phrase must keep its replies offline, so `SavedPhrase` gains `replies`, `saved_phrases` gains `replies jsonb not null default '[]'`, and the sync column map in `src/lib/sync/server.ts` gains one entry. Show cards do not get replies: a card is handed over, not spoken into a conversation.

**UI.** Under the phrase, a "They might say" block: Spanish in body weight, English in muted small. Collapsed behind a disclosure in lists, open on translate results (D4). The disclosure is a real `<button>` with `aria-expanded`.

**Files:** `src/lib/types.ts`, `src/lib/translate.ts`, `src/lib/tripPack.ts`, `src/components/PhraseCard.tsx`, `src/components/TranslationResult.tsx`, `src/lib/local/savedPhrases.ts`, `src/lib/sync/server.ts`, `scripts/*.mjs`, migration 003.

### F4 — Situations within categories ("moments")

**Model.** A moment is a permanent lowercase slug that belongs to one category, with a localized label in `labels.ts` (same rule as categories, SPEC §2 rule 3). New file `src/lib/moments.ts` holds the ordered tuple per category. Proposed set, to be confirmed when the phrases are sorted into it:

| Category | Moments |
|---|---|
| greetings | `meeting`, `courtesy`, `leaving` |
| dining | `arriving`, `ordering`, `dietary`, `paying` |
| transit | `tickets`, `directions`, `on-board`, `taxi` |
| shopping | `browsing`, `prices`, `paying` |
| lodging | `check-in`, `room-problems`, `check-out` |
| emergency | `getting-help`, `medical`, `police-and-loss` |

Moment slugs are unique within a category, not globally (`paying` appears twice), so data keys on `category + moment`.

**Data.** `phrases` gains a nullable `moment` column; the CSV gains a `moment` column; the snapshot carries it. A phrase with no moment falls into an unlabelled group at the end, so fr-FR and de-DE rows keep working untouched.

**UI.** The category page stays one scrolling page with no new routes, so the service worker needs no change:

- Under the banner, a row of chips, one per moment, that jump to that group. The row is sticky under the header.
- The list is split into groups, each led by an eyebrow heading.
- Nothing is hidden behind a tap: scrolling still reaches every phrase.

**Depends on D1.** Without the 50 extra phrases this feature is mostly headings.

### F5 — Fill-in-the-blank phrases

**The rule that makes this safe:** the app never assembles Spanish from parts. Spanish articles and contractions change with the noun (*el baño*, *la estación*, *al baño*, *a la estación*), so every option is written out as a complete fragment **for its own template**, article included, in all four fields. There is no shared vocabulary list.

**Shape.** A template is a normal phrase whose text contains one `{slot}` marker. Its options live in `data/phrases/slots.es-419.csv` (`phrase_id, option_id, sort_order, english, natural, literal, pronunciation`) → table `phrase_slot_options` → snapshot. One slot per phrase in this version.

**Starting set: about twelve templates, 6–10 options each**

- Where is ___? (bathroom, pharmacy, ATM, bus station, exit…)
- I would like ___. (water, the bill, a coffee, a table for two…)
- Do you have ___? (a menu in English, Wi-Fi, a charger, change…)
- I'm allergic to ___. (peanuts, shellfish, gluten, dairy…)
- I need ___. (a doctor, a pharmacy, the police, help…)
- How much is ___? (this, the room per night, the ticket…)
- Plus one or two per remaining category, chosen while authoring.

**UI.** The blank renders inside the sentence as a chip showing the current option. It is a native `<select>` styled as a chip, the same approach onboarding uses, so phones open their own picker and screen readers get a labelled control for free. Picking an option updates the English, the Spanish, the pronunciation and what the speak button says, all on the device.

- The last option is always **"Something else…"**, which opens `/translate` with the English sentence prefilled. That is the bridge from fixed content to the model, and it needs signal.
- Saving a filled phrase saves the resolved sentence as an ordinary `SavedPhrase`. No template machinery reaches the vault or the sync layer.
- Templates work with F3 (replies belong to the template) and F6 (the resolved sentence is what gets shown).

**Not in this version:** two blanks in one phrase, free-typed blanks, numbers and times.

### F6 — Show any phrase full-screen

- **Refactor first.** Split `ShowMode.tsx` into a presentational `ShowSurface` (dark full-screen layout, large Spanish, English underneath, speak button, wake lock, close control) and the existing card loader that feeds it. `/cards/[id]` behaves exactly as today.
- **A client overlay, not a route.** A phrase can come from the bundle, from a translate result that exists only in memory, or from IndexedDB. A URL would need to resolve all three, plus a new service-worker shell. The overlay takes the phrase it was opened from, so it works offline everywhere with no lookup.
- **Entry point.** A "Show" icon button (lucide `Maximize2`) beside Speak and Save on `PhraseCard`, on the translate result and on the essentials list. It appears only when the phrase's target language is Spanish; an es→en result has nothing to show a local.
- **Text.** `natural` for phrases (D5). Short phrases scale up beyond the `display` minimum; long ones wrap at it.
- **Closing.** The close button, Escape, and the phone's back button all close it. The back button matters on Android: the overlay pushes a history entry so Back closes the overlay instead of leaving the page.
- **Accessibility.** A native `<dialog>` opened with `showModal()`, which traps focus and returns it to the Show button on close. Contrast is the existing show-mode pairing.

**Files:** `src/components/ShowMode.tsx` (split), new `ShowSurface.tsx` and `ShowPhraseOverlay.tsx`, `PhraseCard.tsx`, `TranslationResult.tsx`, `EssentialPhrases.tsx`.

---

## 4. Phases

One phase at a time, each shipped to Vercel and logged in `BUILDLOG.md` before the next starts. Time is agent working time and is a guess, based on how long M3–M6 took in this repo; owner review time is extra.

| Phase | Contents | Depends on | Estimate (guess) |
|---|---|---|---|
| 0 | Copy the approved parts of this file into SPEC.md (new §14; edits to §6, §7, §8, §12, §13). Shared types. No feature code. | D1, D2, D6 | 1 hour |
| 1 | **F6** Show any phrase full-screen | — | 1.5 hours |
| 2 | **F1** Onboarding answers in translate and trip pack, trip prefill, cache key, eval run | — | 2.5 hours |
| 3 | **F2** "Your trip" card replaces Daily Phrase | Phase 1 (tap-to-show), Phase 2 (prefill) | 2 hours |
| 4a | Pronunciation guides for the 50 hidden phrases (if D1 = yes) | D3 review | 2 hours |
| 4b | **F4** Moments: migration 003 (`phrases.moment`), CSV, snapshot, category page | Phase 4a | 2.5 hours |
| 5 | **F3** Likely replies: authored preset replies, schema and prompt, saved-phrase sync, UI | Phase 4a, D3, D4, D7 | 4 hours |
| 6 | **F5** Fill-in-the-blank: templates and options, picker UI, save and show paths | Phases 1 and 5 | 4 hours |

Total: about 19.5 hours of agent time (guess), across eight shippable steps.

**Why this order.** Phase 1 is pure client code with no data or prompt changes, so it ships fast and Phase 3 reuses it. Phases 2 and 3 make the app feel personal before any content work. Phases 4–6 each change the phrase data shape, so they run in order of how many later phases lean on them.

**Migrations.** Three small ones (moment column; replies table plus `saved_phrases.replies`; slot options table), each applied to Neon production only with the owner's go-ahead at the time, as migration 002 was.

---

## 5. How each phase is verified

- **Every phase:** `npm run lint`, `npm run typecheck`, `npm run build`; Playwright against `next dev` at iPhone size with screenshots; the offline path checked with the network off; keyboard and screen-reader labels checked on every new control.
- **Prompt changes (Phases 2 and 5):** a script under `scripts/` runs a fixed list of about 20 inputs across three destinations and the three comfort levels, and writes the results to a table for the owner to read. There is no test runner in the repo, so this is a reviewed eval, not an automated test. It needs `ANTHROPIC_API_KEY` in the environment.
- **Authored Spanish (Phases 4a, 5, 6):** delivered as CSV diffs for the D3 reviewer before the snapshot is regenerated. A build-time check fails the build if a reply or slot option points at a phrase id that does not exist, matching the existing check in `essentials.ts`.
- **Sync change (Phase 5):** save a phrase with replies on one device, sign in on a second, confirm the replies arrive; confirm an old row with no replies still loads.

---

## 6. Out of scope

Deliberately left for later, so the plan stays six features:

- Voice input, understanding spoken replies, and follow-up buttons ("more polite", "shorter").
- Search across presets, vault and recents.
- New show-card kinds; pinning beyond what F2's card gives.
- Replies, moments or blanks for fr-FR and de-DE. Every new field is optional per locale, so nothing blocks adding them.
- Country-specific preset phrases (dialect packs, SPEC §1).
- Menu scan (M7), which keeps its own proposal.

---

## 7. Risks

1. **Spanish quality.** The largest risk and the reason for D3. Mitigation: the house rules in `phrases.ts`, a human read of every CSV, and no runtime assembly of Spanish (F5).
2. **Regional over-fitting (F1).** A traveller with destination "Mexico" on a side trip to Guatemala gets Mexican wording. Mitigation: `literal` always stays neutral and is one line below on the card.
3. **Card height.** F3, F5 and F6 all add to `PhraseCard`. Mitigation: D4's disclosure, and a screenshot comparison of the list before and after each phase.
4. **Trip-pack latency (D7).** Mitigation: measure in Phase 5; replies come out of trip packs if it hurts.
5. **Snapshot size.** Replies and options add an estimated 40–60 KB to the bundled JSON (guess). Acceptable for an offline-first app; measured in Phase 5.
