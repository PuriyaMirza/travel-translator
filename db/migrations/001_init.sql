-- 001_init: the five tables of SPEC.md §7.
-- Columns are snake_case. Queries alias them to camelCase (SPEC.md §2 rule 5).

create table if not exists schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);

-- Shared, read-only content. Source of truth for every language pack.
create table phrases (
  id             text not null,
  locale         text not null,
  category       text not null check (category in
                   ('greetings','dining','transit','shopping','lodging','emergency','general')),
  source_text    text not null,
  literal        text not null,
  natural_text   text not null,         -- "natural" is a reserved word in Postgres
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
  id           uuid primary key,
  user_id      text not null,
  locale       text not null,
  title        varchar(60)  not null,
  description  varchar(500) not null,
  phrase_count int not null,
  created_at   timestamptz not null default now()
);
create index trip_packs_user on trip_packs (user_id);

create table saved_phrases (
  id             uuid primary key,
  user_id        text not null,
  locale         text not null,
  source_text    text not null,
  literal        text not null,
  natural_text   text not null,         -- "natural" is a reserved word in Postgres
  cultural_note  text not null default '',
  pronunciation  text not null,
  category       text not null check (category in
                   ('greetings','dining','transit','shopping','lodging','emergency','general')),
  trip_pack_id   uuid references trip_packs(id),
  saved_at       timestamptz not null,
  updated_at     timestamptz not null,
  deleted_at     timestamptz,
  -- Server clock, set on every write. The pull cursor reads this, never
  -- updated_at, which is the client's clock and only decides conflicts.
  synced_at      timestamptz not null default now()
);
create unique index saved_phrases_dedupe
  on saved_phrases (user_id, locale, lower(trim(source_text)))
  where deleted_at is null;
create index saved_phrases_sync on saved_phrases (user_id, synced_at);

create table show_cards (
  id             uuid primary key,
  user_id        text not null,
  locale         text not null,
  kind           text not null check (kind in ('allergy','diet','medical','address','custom')),
  title          text not null,
  source_text    text not null,
  literal        text not null,
  natural_text   text not null,         -- "natural" is a reserved word in Postgres
  cultural_note  text not null default '',
  pronunciation  text not null,
  created_at     timestamptz not null,
  updated_at     timestamptz not null,
  deleted_at     timestamptz,
  synced_at      timestamptz not null default now()
);
create index show_cards_sync on show_cards (user_id, synced_at);

insert into schema_migrations (version) values ('001_init');
