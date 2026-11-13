-- 005_phrase_slot_options: M8 (SPEC.md §14). The options for a
-- fill-in-the-blank phrase: a phrase whose text contains one {slot} marker.
-- Each option holds the complete fragment for each field of its own template,
-- article and preposition included; the app never assembles Spanish.
-- Additive only. Read by the snapshot export, not by the running app, so the
-- app does not depend on this having been applied. Run 003 and 004 first.

create table if not exists phrase_slot_options (
  phrase_id      text not null,
  locale         text not null,
  option_id      text not null,
  sort_order     int  not null,
  source_text    text not null,
  literal        text not null,
  natural_text   text not null,
  pronunciation  text not null,
  review         text not null default 'ok' check (review in ('ok','draft')),
  primary key (phrase_id, locale, option_id),
  foreign key (phrase_id, locale) references phrases (id, locale)
);

insert into schema_migrations (version) values ('005_phrase_slot_options')
  on conflict (version) do nothing;
