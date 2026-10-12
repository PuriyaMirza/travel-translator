# Proposal: Firestore → Neon (Postgres) with local-first offline sync

Status: **approved 2026-10-12 and applied to SPEC.md.** Decisions: snake_case columns with SQL aliases; Neon Auth; `idb`; the owner creates the Neon project in the Neon console (not via the Vercel Marketplace).
no database exists yet. On approval, the "SPEC.md changes" below are applied
verbatim and committed with a BUILDLOG entry.

## Why

- One platform: Neon via the Vercel Marketplace, alongside the owner's other apps.
- The data is relational (phrases × locales × situations, plus per-user copies),
  which SQL handles better than document queries.
- Cost accepted: offline sync is built by us, not given by the database.

## The offline model (the part that replaces Firestore's cache)

Two kinds of data, two strategies:

1. **Phrase library: read-only, so no sync.** Neon's `phrases` table is the
   source of truth. A script exports it to a committed JSON snapshot that is
   bundled into the app. The phrasebook therefore works with zero signal on
   first load, as it does today, and builds never need database access.
2. **User data: saved phrases, show cards, settings.** Local-first:
   - Every write goes to **IndexedDB first**, and the UI updates from there immediately.
   - Each write also lands in an **outbox** store in IndexedDB.
   - When online and signed in, the outbox flushes to `POST /api/sync`. Then
     `GET /api/sync?since=<cursor>` pulls changes made on other devices.
   - Row ids are **client-generated UUIDs**, so a card made offline keeps its id after syncing.
   - Deletes are **tombstones** (`deletedAt`), so they sync too.
   - Conflicts are **last write wins on `updatedAt`**, resolved on the server.
   - Logged out: same IndexedDB stores, and the outbox just waits. On sign-in,
     it flushes. This replaces the old "localStorage then upload on login" path:
     one code path instead of two.

## SPEC.md changes

### §2 rule 5: replace

> 5. **camelCase everywhere** in TypeScript and JSON API responses. Postgres
>    columns are snake_case (Postgres folds unquoted identifiers to lowercase).
>    The one mapping point is the SQL itself: queries alias columns
>    (`source_text AS "sourceText"`), so nothing above the query layer ever sees snake_case.

### §3 stack table: replace the Database, Auth, and Server auth rows

| Layer | Choice |
|---|---|
| Database | Neon Postgres, provisioned through the Vercel Marketplace. Driver: `@neondatabase/serverless`. Plain SQL migrations in `db/migrations/`; no ORM. |
| Auth | Neon Auth, email/password. Sessions verified server-side in route handlers. |
| Offline store | IndexedDB on the device (see §7 "Local-first sync"). |

Delete the `firebase-admin` row and the paragraph about provisioning a fresh Firebase project.

### §7 data model: replace with

```sql
-- Shared, read-only content. Source of truth for every language pack.
create table phrases (
  id             text not null,          -- e.g. 'dining-menu'; same id across locales
  locale         text not null,          -- 'es-419', 'fr-FR', 'de-DE'
  category       text not null check (category in
                   ('greetings','dining','transit','shopping','lodging','emergency','general')),
  source_text    text not null,          -- English
  literal        text not null,
  natural        text not null,
  cultural_note  text not null default '',
  pronunciation  text not null default '',
  sort_order     int  not null default 0,
  primary key (id, locale)
);

-- Per-user settings. user_id is the Neon Auth user id.
create table user_settings (
  user_id          text primary key,
  preferred_locale text not null default 'es-419',
  speaker_gender   text not null default 'neutral'
                     check (speaker_gender in ('neutral','feminine','masculine')),
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
  natural        text not null,
  cultural_note  text not null default '',
  pronunciation  text not null,
  category       text not null,
  trip_pack_id   uuid references trip_packs(id),
  saved_at       timestamptz not null,
  updated_at     timestamptz not null,
  deleted_at     timestamptz              -- tombstone
);
create unique index saved_phrases_dedupe
  on saved_phrases (user_id, locale, lower(trim(source_text)))
  where deleted_at is null;
create index saved_phrases_sync on saved_phrases (user_id, updated_at);

create table show_cards (
  id             uuid primary key,         -- client-generated
  user_id        text not null,
  locale         text not null,
  kind           text not null check (kind in ('allergy','diet','medical','address','custom')),
  title          text not null,
  source_text    text not null,
  literal        text not null,
  natural        text not null,
  cultural_note  text not null default '',
  pronunciation  text not null,
  created_at     timestamptz not null,
  updated_at     timestamptz not null,
  deleted_at     timestamptz
);
create index show_cards_sync on show_cards (user_id, updated_at);
```

Unchanged from today: the TypeScript types `SavedPhrase`, `ShowCard`, and
`TripPack` keep their camelCase fields; `locale` stays required on every record;
`category`, `kind`, and `speakerGender` stay permanent lowercase slugs.

Changed:
- `syncedFromLocal` is **removed**. The outbox makes it redundant.
- `deletedAt` is **added** to `SavedPhrase` and `ShowCard`.
- `UserDoc` becomes `UserSettings`. Email and login times live in Neon Auth, not our table.

**Access control** replaces Firestore security rules. Every route handler that
touches user tables calls one helper, `requireUser(request)`, which returns the
verified user id or a 401. Every query filters on `user_id = $1` with that id,
never with an id taken from the request body. Postgres row-level security is a
possible later hardening and is not required for v1.

**Local-first sync** replaces the current "Local-first sync" subsection:
- The model is the one in "The offline model" above.
- It is one sync helper, parameterised by table, dedupe key, and timestamp field.
- Dedupe keys: saved phrases `locale + normalized sourceText`; show cards
  `kind + locale + normalized sourceText`.
- Trip packs are created online only (they need the model call) and are cached
  into IndexedDB after creation.
- `speakerGender`, logged out, lives in IndexedDB and syncs to `user_settings` on
  sign-in if the server still has the default.

### §9 offline: replace the Firestore bullets

- The phrase library ships in the bundle (snapshot from Neon). Fully offline, no fetch.
- User data is read from IndexedDB; the network is only for sync. "Don't hand-roll it" is struck: we hand-roll the outbox, and keep it to the one helper.
- `/cards` and `/cards/[id]` render entirely from IndexedDB. No server fetch on that path. (Unchanged intent.)
- The service worker does not cache `/api/sync`; sync runs on `online` events and app focus.

### §10 build order

- **M3 — Accounts and vault.** Neon Auth (email/password), Neon schema +
  migrations, `requireUser()`, `/api/sync` (push and pull), the IndexedDB stores
  and outbox, and the generic sync helper. All four tables ship, even though
  `show_cards` and `trip_packs` have no writer until M5 and M6. Also: the
  `phrases` table, seeded from `data/phrases/*.csv`, plus the snapshot export script.
- **M4 — Offline.** Service worker, manifest, install, and offline states. Sync is
  already offline-tolerant from M3, so M4 is shell caching and UI states.
- **M6:** "adds `firebase-admin`" becomes "uses `requireUser()`". The
  `/api/trip-pack` 401 behaviour is unchanged.

### §11 and §13: small edits

- §11: drop the reference to the old repo's `firestore.rules`.
- §13 step 4: "straight to Firestore" becomes "to IndexedDB + outbox, synced via `/api/sync`".
- §13: "verifies the token with `firebase-admin`" becomes "calls `requireUser()`"; the request sends the Neon Auth session instead of a Firebase ID token.

## New dependencies (need approval per CLAUDE.md)

1. `@neondatabase/serverless`: the Postgres driver, for Vercel serverless and edge.
2. Neon Auth SDK: exact package confirmed against Neon docs before M3 code lands.
3. `idb`: about 1 KB, a promise wrapper over IndexedDB. Optional; raw IndexedDB works without it, with more code.

## New env vars

- `DATABASE_URL`: set automatically by the Vercel Neon integration.
- Neon Auth keys: names confirmed with the SDK.

## Open questions for the owner

1. Approve snake_case columns with SQL aliases (rule 5 change), or keep camelCase by quoting every column (`"sourceText"`)?
2. Approve Neon Auth, or use another auth provider?
3. Approve `idb`, or use raw IndexedDB?
4. Create a new Neon project for this app through the Vercel Marketplace, so it's billed and managed in Vercel? (`amtrak-explorer` stays untouched.)
