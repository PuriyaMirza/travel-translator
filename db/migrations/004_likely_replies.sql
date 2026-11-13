-- 004_likely_replies: M8 (SPEC.md §14). What the other person is likely to
-- say back: authored replies for preset phrases, and a place to keep the
-- replies of a saved phrase so they reach the user's other devices.
-- Additive only.
--
-- The app does not need this applied to keep working. `phrase_replies` is
-- read by the snapshot export, not the running app, and the sync layer only
-- reads and writes `saved_phrases.replies` once it finds the column exists.
-- Run 003_phrase_moments first.

create table if not exists phrase_replies (
  phrase_id   text not null,
  locale      text not null,
  sort_order  int  not null,
  reply       text not null,
  meaning     text not null,
  review      text not null default 'ok' check (review in ('ok','draft')),
  primary key (phrase_id, locale, sort_order),
  foreign key (phrase_id, locale) references phrases (id, locale)
);

alter table saved_phrases
  add column if not exists replies jsonb not null default '[]';

insert into schema_migrations (version) values ('004_likely_replies')
  on conflict (version) do nothing;
